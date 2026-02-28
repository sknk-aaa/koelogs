# frozen_string_literal: true

require "set"

module Ai
  class WebSearchDecision
    class << self
      def decide(query:, responder_type:, menu_names: [])
        text = query.to_s.strip
        return { use_search: false, reason: "blank_query" } if text.blank?

        return { use_search: true, reason: "explicit_request" } if explicit_request?(text)
        return { use_search: true, reason: "time_sensitive" } if time_sensitive?(text)
        return { use_search: true, reason: "safety_or_medical" } if safety_or_medical?(text)
        return { use_search: true, reason: "unknown_term" } if unknown_term_detected?(text)

        if responder_type.to_s == "recommendation_followup" && followup_needs_method_basis?(text, menu_names)
          return { use_search: true, reason: "followup_method_basis" }
        end

        return { use_search: false, reason: "local_context_only" } if local_context_only?(text)

        { use_search: false, reason: "default_skip" }
      end

      private

      def explicit_request?(text)
        keywords = %w[調べて 検索して 出典 ソース URL 参考文献 根拠を示して]
        include_any?(text, keywords)
      end

      def time_sensitive?(text)
        keywords = %w[最新 最近 いま 今週 今月 今年 2026 アップデート]
        include_any?(text, keywords)
      end

      def safety_or_medical?(text)
        keywords = %w[痛み 炎症 嗄声 声枯れ 受診 薬 診断 治療 医療]
        include_any?(text, keywords)
      end

      def local_context_only?(text)
        keywords = %w[ログ 要約 振り返り 感想 進捗 今日 昨日 先週]
        include_any?(text, keywords)
      end

      def followup_needs_method_basis?(text, menu_names)
        method_keywords = %w[なぜ 理由 根拠 効果 やり方 コツ 注意点]
        return false unless include_any?(text, method_keywords)

        unknown_menu_names(menu_names).any?
      end

      def unknown_term_detected?(text)
        detect_unknown_english_terms(text).any?
      end

      def unknown_menu_names(menu_names)
        Array(menu_names).map(&:to_s).reject(&:blank?).select do |name|
          detect_unknown_english_terms(name).any?
        end
      end

      def detect_unknown_english_terms(text)
        tokens = text.scan(/[A-Za-z][A-Za-z0-9+#-]{2,}/).map(&:downcase).uniq
        tokens - known_terms.to_a
      end

      def known_terms
        @known_terms ||= Set.new(%w[
          voice vocal singing singer pitch tone note range resonance
          breath breathing chest head falsetto mixed passaggio belt belting
          twang siren trill lip roll humming hum buzz mum sovt straw
          exercise training warmup cooldown tempo scale octave semitone
          long tone sustain volume stability accuracy melody
        ])
      end

      def include_any?(text, keywords)
        keywords.any? { |kw| text.include?(kw) }
      end
    end
  end
end
