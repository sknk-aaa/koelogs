# frozen_string_literal: true

require "json"

module Ai
  class RecommendationCommunityMatcher
    MAX_CANDIDATES_FOR_LLM = 20

    class << self
      def match(user:, explicit_theme:, goal_text:, diagnosis_context:, candidates:, client: Gemini::Client.new)
        new(
          user: user,
          explicit_theme: explicit_theme,
          goal_text: goal_text,
          diagnosis_context: diagnosis_context,
          candidates: candidates,
          client: client
        ).match
      end
    end

    def initialize(user:, explicit_theme:, goal_text:, diagnosis_context:, candidates:, client:)
      @user = user
      @explicit_theme = normalize_text(explicit_theme)
      @goal_text = normalize_text(goal_text)
      @diagnosis_context = normalize_text(diagnosis_context)
      @candidates = Array(candidates)
      @client = client
    end

    def match
      source = candidates.first(MAX_CANDIDATES_FOR_LLM)
      return empty_result if source.empty?

      result = client.generate_text_with_usage!(
        system_text: build_system_text,
        user_text: build_user_text(source),
        max_output_tokens: 1800,
        temperature: 0.2,
        user: user,
        feature: "recommendation_matcher",
        web_search: false
      )

      parsed = parse_result(result[:text])
      ranked = normalize_ranked(parsed[:matched], source)
      used_ids = ranked.map { |row| row[:id] }
      alternates = source.reject { |row| used_ids.include?(row[:id]) }.first(20)
      {
        matched: ranked,
        alternates: alternates,
        raw_text: result[:text].to_s
      }
    rescue => e
      Rails.logger.warn("[AI][RecommendationCommunityMatcher] #{e.class}: #{e.message}")
      fallback(source)
    end

    private

    attr_reader :user, :explicit_theme, :goal_text, :diagnosis_context, :candidates, :client

    def empty_result
      { matched: [], alternates: [], raw_text: "" }
    end

    def build_system_text
      <<~SYS
        あなたはボイストレーニング推薦の一致判定アシスタントです。
        候補投稿の自由記述を読み、ユーザー文脈（今の状態/次の狙い）に近い順で選びます。

        出力はJSONのみ:
        {
          "matched": [
            { "id": 123, "score": 0.0-1.0, "reason": "短文" }
          ]
        }

        ルール:
        - 最大12件まで返す。
        - scoreは相対評価でよい。
        - メニュー名より自由記述の意味一致を重視。
        - 一致観点は次を参考にする（例であり語に限定しない）:
          1) 音域・音高: F#4付近 / ミドル / 換声点 など
          2) 症状: 詰まり / 力み / 息漏れ など
          3) 効果: つながる / 安定 / 抜ける など
        - 音高は近傍一致を許容する。例: F#4 は ±2半音（E4〜G#4）も一致候補に含める。
        - 曖昧な候補は除外してよい。
      SYS
    end

    def build_user_text(source)
      lines = []
      lines << "ユーザー文脈:"
      lines << "- 今日のテーマ: #{explicit_theme.presence || '(未指定)'}"
      lines << "- 目標: #{goal_text.presence || '(未設定)'}"
      lines << "- 診断要約: #{diagnosis_context.presence || '(なし)'}"
      lines << ""
      lines << "候補投稿:"
      source.each do |row|
        lines << "- id=#{row[:id]} menu=#{row[:menu_label]} tags=#{row[:improvement_tags].join('|')}"
        lines << "  comment=#{row[:comment].presence || '(なし)'}"
      end
      lines.join("\n")
    end

    def parse_result(text)
      raw = text.to_s
      start_idx = raw.index("{")
      end_idx = raw.rindex("}")
      return { matched: [] } if start_idx.nil? || end_idx.nil? || end_idx <= start_idx

      json = JSON.parse(raw[start_idx..end_idx])
      { matched: Array(json["matched"]) }
    rescue JSON::ParserError
      { matched: [] }
    end

    def normalize_ranked(rows, source)
      index = source.each_with_object({}) { |row, memo| memo[row[:id]] = row }
      out = Array(rows).filter_map do |row|
        next unless row.is_a?(Hash)

        id = Integer(row["id"], exception: false)
        next if id.nil?
        candidate = index[id]
        next if candidate.nil?

        score = row["score"].to_f
        {
          id: id,
          score: [ [ score, 0.0 ].max, 1.0 ].min,
          reason: normalize_text(row["reason"]),
          candidate: candidate
        }
      end

      out.sort_by { |row| [ -row[:score], -row.dig(:candidate, :id).to_i ] }
    end

    def fallback(source)
      ranked = source.first(8).map.with_index do |candidate, idx|
        {
          id: candidate[:id],
          score: 1.0 - (idx * 0.05),
          reason: "fallback",
          candidate: candidate
        }
      end
      {
        matched: ranked,
        alternates: source.drop(8).first(20),
        raw_text: ""
      }
    end

    def normalize_text(text)
      text.to_s.gsub(/\s+/, " ").strip
    end
  end
end
