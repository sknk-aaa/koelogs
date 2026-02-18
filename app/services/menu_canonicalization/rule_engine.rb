# frozen_string_literal: true

module MenuCanonicalization
  class RuleEngine
    VERSION = 1
    LOW_CONFIDENCE_THRESHOLD = 0.75
    REGISTER_VALUES = %w[falsetto chest mixed unspecified].freeze
    CORE_DEFINITIONS = {
      "lip_roll" => {
        label: "リップロール",
        score: 0.95,
        patterns: [ /リップロール/, /lip[\s_-]*roll/, /lip[\s_-]*trill/ ]
      },
      "nay" => {
        label: "Nay",
        score: 0.95,
        patterns: [ /\bnay\b/, /ネイ/ ]
      },
      "humming" => {
        label: "ハミング",
        score: 0.95,
        patterns: [ /ハミング/, /\bhumming\b/, /\bhum\b/ ]
      },
      "mum_buzz" => {
        label: "Mum+Buzz",
        score: 0.95,
        patterns: [ /mum\s*\+\s*buzz/, /\bmum\b/, /\bbuzz\b/, /マム/, /バズ/ ]
      },
      "scale_phonation_5tone" => {
        label: "5tone発声",
        score: 0.9,
        patterns: [ /5\s*tone/, /５\s*tone/, /five\s*tone/, /5トーン/, /五音/, /5tone発声/ ]
      },
      "chest_strengthening" => {
        label: "地声強化",
        score: 0.88,
        patterns: [ /地声.*(強化|トレ|練習)/, /(強化|トレ|練習).*地声/, /\bchest\b.*(train|strength)/ ]
      },
      "voice_strengthening" => {
        label: "発声強化",
        score: 0.7,
        patterns: [ /発声.*(強化|トレ|練習)/, /(強化|トレ|練習).*発声/ ]
      }
    }.freeze

    Result = Struct.new(
      :normalized_name,
      :canonical_core_key,
      :canonical_register,
      :canonical_key,
      :canonical_confidence,
      :canonical_source,
      :canonical_version,
      :low_confidence?,
      keyword_init: true
    )

    def self.classify(name:)
      normalized_name = normalize_name(name)
      return unknown_result(normalized_name: normalized_name, confidence: 0.0) if normalized_name.blank?

      alias_row = MenuAlias.find_by(normalized_name: normalized_name)
      if alias_row
        core, register = split_key(alias_row.canonical_key)
        confidence = [ [ alias_row.confidence.to_f, 0.9 ].max, 1.0 ].min
        return build_result(
          normalized_name: normalized_name,
          core_key: core,
          register: register,
          confidence: confidence,
          source: alias_row.source
        )
      end

      core_match = detect_core(normalized_name)
      register = detect_register(normalized_name)

      if core_match.nil?
        return unknown_result(normalized_name: normalized_name, register: register, confidence: 0.45)
      end

      build_result(
        normalized_name: normalized_name,
        core_key: core_match[:core_key],
        register: register,
        confidence: core_match[:score],
        source: "rule"
      )
    end

    def self.normalize_name(name)
      raw = name.to_s.unicode_normalize(:nfkc).downcase
      raw = raw.gsub(/[[:space:]]+/, " ").strip
      raw.gsub(/[,_]/, " ")
         .gsub(/[\/]/, " ")
         .gsub(/[\(\)\[\]{}]/, " ")
         .gsub(/[[:space:]]+/, " ")
         .strip
    end

    def self.build_key(core_key:, register:)
      "#{core_key.presence || 'unknown'}|#{register.presence || 'unspecified'}"
    end

    def self.label_for_key(key)
      core_key, register = split_key(key)
      core_label = CORE_DEFINITIONS.dig(core_key, :label) || "未分類メニュー"
      register_label = register_label_for(register)
      return core_label if register == "unspecified"

      "#{core_label}（#{register_label}）"
    end

    def self.split_key(key)
      parts = key.to_s.split("|", 2)
      core = parts[0].presence || "unknown"
      register = parts[1].presence || "unspecified"
      register = "unspecified" unless REGISTER_VALUES.include?(register)
      [ core, register ]
    end

    def self.detect_core(normalized_name)
      CORE_DEFINITIONS
        .map do |core_key, defn|
          matched = defn[:patterns].any? { |re| normalized_name.match?(re) }
          next unless matched
          { core_key: core_key, score: defn[:score].to_f }
        end
        .compact
        .max_by { |row| row[:score] }
    end
    private_class_method :detect_core

    def self.detect_register(normalized_name)
      return "falsetto" if normalized_name.match?(/裏声|falsetto|head\s*voice/)
      return "chest" if normalized_name.match?(/地声|chest\s*voice|\bchest\b/)
      return "mixed" if normalized_name.match?(/ミックス|mix\s*voice|\bmix\b/)

      "unspecified"
    end
    private_class_method :detect_register

    def self.unknown_result(normalized_name:, register: "unspecified", confidence: 0.0)
      build_result(
        normalized_name: normalized_name,
        core_key: "unknown",
        register: register,
        confidence: confidence,
        source: "rule"
      )
    end
    private_class_method :unknown_result

    def self.build_result(normalized_name:, core_key:, register:, confidence:, source:)
      sanitized_register = REGISTER_VALUES.include?(register) ? register : "unspecified"
      final_core = core_key.to_s.presence || "unknown"
      final_conf = confidence.to_f.clamp(0.0, 1.0)

      if final_conf < LOW_CONFIDENCE_THRESHOLD
        final_core = "unknown"
      end

      Result.new(
        normalized_name: normalized_name,
        canonical_core_key: final_core,
        canonical_register: sanitized_register,
        canonical_key: build_key(core_key: final_core, register: sanitized_register),
        canonical_confidence: final_conf,
        canonical_source: source.to_s.in?(%w[rule ai manual]) ? source.to_s : "rule",
        canonical_version: VERSION,
        low_confidence?: final_conf < LOW_CONFIDENCE_THRESHOLD
      )
    end
    private_class_method :build_result

    def self.register_label_for(register)
      case register
      when "falsetto" then "裏声"
      when "chest" then "地声"
      when "mixed" then "ミックス"
      else "指定なし"
      end
    end
    private_class_method :register_label_for
  end
end
