# frozen_string_literal: true

require "json"

module Ai
  class RecommendationWebEvidence
    LIGHT_SOURCE_LIMIT = 2
    HIGH_SOURCE_LIMIT = 3
    LIGHT_MENU_HINT_LIMIT = 2
    HIGH_MENU_HINT_LIMIT = 3

    class << self
      def fetch(user:, goal_text:, explicit_theme:, goal_tag_labels:, recent_logs:, intensity:, client: Gemini::Client.new)
        new(
          user: user,
          goal_text: goal_text,
          explicit_theme: explicit_theme,
          goal_tag_labels: goal_tag_labels,
          recent_logs: recent_logs,
          intensity: intensity,
          client: client
        ).fetch
      end
    end

    def initialize(user:, goal_text:, explicit_theme:, goal_tag_labels:, recent_logs:, intensity:, client:)
      @user = user
      @goal_text = normalize_text(goal_text)
      @explicit_theme = normalize_text(explicit_theme)
      @goal_tag_labels = Array(goal_tag_labels).map { |v| normalize_text(v) }.reject(&:blank?).uniq
      @recent_logs = Array(recent_logs).compact
      @intensity = intensity.to_sym == :high ? :high : :light
      @client = client
    end

    def fetch
      result = client.generate_text_with_usage!(
        system_text: build_system_text,
        user_text: build_user_text,
        max_output_tokens: output_token_limit,
        temperature: 0.2,
        user: user,
        feature: "recommendation_web",
        web_search: true
      )

      parsed = parse_payload(result[:text])
      sources = sanitize_sources(result[:sources])
      web_used = parsed[:insights].any? || parsed[:menu_hints].any? || sources.any?
      {
        attempted: true,
        used: web_used,
        intensity: intensity,
        query: query_text,
        insights: parsed[:insights].first(3),
        menu_hints: parsed[:menu_hints].first(menu_hint_limit),
        sources: sources
      }
    rescue => e
      Rails.logger.warn("[AI][RecommendationWebEvidence] #{e.class}: #{e.message}")
      {
        attempted: true,
        used: false,
        intensity: intensity,
        query: query_text,
        insights: [],
        menu_hints: [],
        sources: [],
        error: "#{e.class}: #{e.message}"
      }
    end

    private

    attr_reader :user, :goal_text, :explicit_theme, :goal_tag_labels, :recent_logs, :intensity, :client

    def build_system_text
      <<~SYS
        あなたはボイストレーニングの情報整理アシスタントです。
        Web上の一般的な練習知見を確認し、次のJSONだけを返してください。
        禁止: Markdown、前置き、コードブロック。

        出力JSON形式:
        {
          "insights": ["短文", "..."],
          "menu_hints": [
            { "name": "メニュー名", "reason": "狙いを1文で" }
          ]
        }

        ルール:
        - insights は最大3件。
        - menu_hints は最大#{menu_hint_limit}件。
        - 疑わしい断定は避け、実践しやすい内容を優先する。
      SYS
    end

    def build_user_text
      lines = []
      lines << "検索テーマ:"
      lines << "- 明示テーマ: #{explicit_theme.presence || '(未指定)'}"
      lines << "- 目標: #{goal_text.presence || '(未設定)'}"
      lines << "- 目標タグ: #{goal_tag_labels.presence&.join(' / ') || '(未設定)'}"
      lines << "- Web参照強度: #{intensity == :high ? 'high' : 'light'}"
      lines << "- 検索クエリ: #{query_text}"
      lines << ""
      lines << "最近の練習メモ（抜粋）:"
      recent_note_lines.each { |row| lines << row }
      lines.join("\n")
    end

    def query_text
      parts = []
      parts << explicit_theme if explicit_theme.present?
      parts << goal_text if goal_text.present?
      parts << goal_tag_labels.join(" ")
      parts << "ボイストレーニング 練習メニュー 根拠"
      parts.map { |v| normalize_text(v) }.reject(&:blank?).uniq.join(" / ")
    end

    def recent_note_lines
      notes = recent_logs.reverse_each.filter_map do |log|
        text = log.respond_to?(:notes) ? normalize_text(log.notes.to_s) : ""
        next if text.blank?

        date = log.respond_to?(:practiced_on) && log.practiced_on.present? ? log.practiced_on.iso8601 : "日付不明"
        "・#{date}: #{text.slice(0, 90)}"
      end
      return [ "・(なし)" ] if notes.empty?

      notes.first(3)
    end

    def output_token_limit
      intensity == :high ? 1200 : 800
    end

    def source_limit
      intensity == :high ? HIGH_SOURCE_LIMIT : LIGHT_SOURCE_LIMIT
    end

    def menu_hint_limit
      intensity == :high ? HIGH_MENU_HINT_LIMIT : LIGHT_MENU_HINT_LIMIT
    end

    def parse_payload(text)
      json_text = extract_json_object(text)
      parsed = json_text.present? ? JSON.parse(json_text) : {}
      insights = Array(parsed["insights"]).map { |v| normalize_text(v) }.reject(&:blank?)
      menu_hints = Array(parsed["menu_hints"]).filter_map do |row|
        next unless row.is_a?(Hash)
        name = normalize_text(row["name"])
        reason = normalize_text(row["reason"])
        next if name.blank? || reason.blank?

        { name: name, reason: reason }
      end
      {
        insights: insights,
        menu_hints: menu_hints
      }
    rescue JSON::ParserError
      fallback = normalize_text(text)
      return { insights: [], menu_hints: [] } if fallback.blank?

      { insights: [ fallback.slice(0, 120) ], menu_hints: [] }
    end

    def extract_json_object(text)
      raw = text.to_s
      start_idx = raw.index("{")
      end_idx = raw.rindex("}")
      return nil if start_idx.nil? || end_idx.nil? || end_idx <= start_idx

      raw[start_idx..end_idx]
    end

    def sanitize_sources(raw_sources)
      Array(raw_sources).filter_map do |source|
        next unless source.is_a?(Hash)
        url = normalize_text(source[:url] || source["url"])
        next if url.blank?
        title = normalize_text(source[:title] || source["title"])
        title = "参考情報" if title.blank?

        { title: title, url: url }
      end.uniq { |s| s[:url] }.first(source_limit)
    end

    def normalize_text(value)
      value.to_s.gsub(/\s+/, " ").strip
    end
  end
end
