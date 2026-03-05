# frozen_string_literal: true

require "json"

module Ai
  class ChatMemoryCandidateExtractor
    TRIGGER_PATTERNS = [
      /保存して/,
      /保存してほしい/,
      /覚えておいて/,
      /覚えておいてほしい/,
      /覚えて/,
      /覚えてほしい/,
      /記憶して/,
      /記憶してほしい/,
      /今後は/,
      /これからは/,
      /以後/,
      /ようにして/,
      /でお願いします/,
      /で頼む/
    ].freeze

    PROFILE_HINTS = %w[
      呼び名 ニックネーム 名前 呼んで
      口調 文体 返答 回答 長さ
      職業 仕事 学校 所属 趣味 価値観
    ].freeze

    VOICE_HINTS = %w[
      声 発声 高音 低音 裏声 地声 ミックス
      音程 音量 ロングトーン 喉 息 練習
    ].freeze

    MAX_CANDIDATE_CHARS = 220

    class << self
      def extract(message_text, user: nil, client: nil)
        text = normalize_text(message_text)
        return nil if text.blank?

        trigger = TRIGGER_PATTERNS.find { |pattern| text.match?(pattern) }

        llm_client = client || Gemini::Client.new
        extracted = extract_with_ai(text: text, user: user, client: llm_client)
        return extracted if extracted.present?
        return implicit_extract(text) if trigger.nil? && implicit_memory_candidate?(text)
        return nil if trigger.nil?

        fallback_extract(text, trigger)
      rescue => e
        Rails.logger.warn("[AI][ChatMemoryCandidateExtractor] #{e.class}: #{e.message}")
        text = normalize_text(message_text)
        trigger = TRIGGER_PATTERNS.find { |pattern| text.match?(pattern) }
        return implicit_extract(text) if trigger.nil? && implicit_memory_candidate?(text)
        return nil if trigger.nil?

        fallback_extract(text, trigger)
      end

      private

      def extract_with_ai(text:, user:, client:)
        raw = client.generate_text!(
          system_text: system_text,
          user_text: user_text(text),
          max_output_tokens: 220,
          temperature: 0.0,
          user: user,
          feature: "chat"
        )
        parsed = parse_json(raw)
        return nil unless parsed.is_a?(Hash)
        return nil if parsed["save"] == false

        candidate_text = normalize_candidate(parsed["candidate_text"])
        return nil if candidate_text.blank?

        destination = normalize_destination(parsed["destination"], candidate_text)
        {
          candidate_text: candidate_text,
          suggested_destination: destination,
          trigger: "llm"
        }
      rescue => e
        Rails.logger.warn("[AI][ChatMemoryCandidateExtractor] ai_extract_failed #{e.class}: #{e.message}")
        nil
      end

      def system_text
        <<~SYS
          あなたはチャットの保存候補抽出アシスタントです。
          ユーザー文から「記憶に保存すべき事実」だけを抽出してください。

          出力はJSONのみ。次の形式を厳守:
          {"save":true|false,"candidate_text":"...","destination":"voice|profile"}

          ルール:
          - 保存しない場合は save=false, candidate_text="" を返す
          - 質問・依頼・雑談は保存対象にしない
          - 「教えて」「どうすれば」などの質問文は除外
          - 「覚えて」「保存して」は命令なので保存本文に含めない
          - 「現在/今」「悩んでいる」「課題」「停滞」「不安定」など、ユーザーの継続的な状態・課題の自己申告は保存候補にしてよい（明示的な保存命令がなくてもsave=true可）
          - 保存本文は1文・220文字以内・事実のみ
          - 推測や言い換えで意味を変えない
          - 声/発声/歌唱課題なら destination="voice"
          - それ以外のプロフィール情報なら destination="profile"
        SYS
      end

      def user_text(text)
        <<~TXT
          次のユーザー文を判定してください。
          ユーザー文: #{text}
        TXT
      end

      def parse_json(raw)
        text = raw.to_s.strip
        text = text.gsub(/\A```(?:json)?\s*/i, "").gsub(/\s*```\z/, "")
        json_part = text[/\{.*\}/m] || text
        JSON.parse(json_part)
      rescue JSON::ParserError => e
        raise "invalid_json_from_llm: #{e.message}"
      end

      def normalize_text(value)
        value.to_s.gsub(/\s+/, " ").strip.slice(0, 800)
      end

      def normalize_candidate(value)
        candidate = value.to_s.gsub(/\s+/, " ").strip
        candidate = candidate.sub(/\A[「『"]/, "").sub(/[」』"]\z/, "")
        candidate = candidate.sub(/[。.!！?？]+\z/, "")
        candidate = candidate.strip
        return "" if candidate.blank?

        candidate.slice(0, MAX_CANDIDATE_CHARS)
      end

      def normalize_destination(value, candidate_text)
        _destination = value.to_s.strip
        _candidate_text = candidate_text.to_s
        "voice"
      end

      def fallback_extract(text, trigger)
        candidate = text.dup
        candidate.gsub!(/\A(?:今後は|これからは|以後)\s*/, "")
        candidate.gsub!(/(?:保存してほしい|保存して|覚えておいてほしい|覚えておいて|覚えてほしい|覚えて|記憶してほしい|記憶して|でお願いします|で頼む|ようにして)(?:ください)?[。.!！]*\z/, "")
        candidate.gsub!(/(?:お願いします|頼む)(?:。|！|!)*\z/, "")
        candidate = pick_candidate_sentence(candidate)
        candidate.gsub!(/\A(?:今|現在)?悩んで(?:いる|る)(?:んだけど|いて|ますが)?、?/, "")
        candidate.gsub!(/\A(?:今の)?課題(?:は|って)?\s*/, "")
        candidate.gsub!(/[。.!！?？]+\z/, "")
        candidate = normalize_candidate(candidate)
        return nil if candidate.blank?

        {
          candidate_text: candidate,
          suggested_destination: infer_destination(candidate),
          trigger: trigger&.source.to_s
        }
      end

      def pick_candidate_sentence(text)
        sentences = text.to_s.split(/(?<=[。.!！?？])/).map { |s| s.strip }.reject(&:blank?)
        return text if sentences.empty?

        filtered = sentences.reject { |s| question_like_sentence?(s) || memory_instruction_sentence?(s) }
        return filtered.first if filtered.present?

        sentences.first
      end

      def question_like_sentence?(sentence)
        s = sentence.to_s
        return true if s.match?(/[?？]/)
        return true if s.include?("教えてほしい") || s.include?("どうするべき") || s.include?("どうすれば")

        false
      end

      def memory_instruction_sentence?(sentence)
        s = sentence.to_s
        trigger = /(保存して|覚えて|記憶して|今後は|これからは|以後|ようにして|でお願いします|で頼む)/
        s.match?(trigger)
      end

      def infer_destination(text)
        _text = text.to_s
        "voice"
      end

      def implicit_memory_candidate?(text)
        t = text.to_s
        return false if t.match?(/[?？]/)
        return false if t.match?(/教えて|どうすれば|どうするべき|方法|なぜ|ですか|ますか/)

        state_words = /現在|今|最近|ここ最近|継続|いつも|ずっと/
        issue_words = /悩んで|課題|停滞|伸びない|安定しない|不安定|苦手|しんどい|難しい/
        first_person = /私|わたし|自分|僕|ぼく|俺|おれ/

        (t.match?(issue_words) && (t.match?(state_words) || t.match?(first_person)))
      end

      def implicit_extract(text)
        candidate = pick_candidate_sentence(text)
        candidate = normalize_candidate(candidate)
        return nil if candidate.blank?

        {
          candidate_text: candidate,
          suggested_destination: infer_destination(candidate),
          trigger: "implicit_state"
        }
      end
    end
  end
end
