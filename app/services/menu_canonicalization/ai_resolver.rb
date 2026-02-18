# frozen_string_literal: true

require "json"

module MenuCanonicalization
  class AiResolver
    APPLY_THRESHOLD = 0.65

    def initialize(client: Gemini::Client.new)
      @client = client
    end

    # return nil when unresolved
    # return hash when resolved:
    # { canonical_core_key:, canonical_register:, canonical_key:, canonical_confidence:, canonical_source:, canonical_version: }
    def resolve(name:, normalized_name:)
      allowed_core_keys = MenuCanonicalization::RuleEngine::CORE_DEFINITIONS.keys
      allowed_registers = MenuCanonicalization::RuleEngine::REGISTER_VALUES

      system_text = <<~SYS
        あなたはボイストレーニングメニュー正規化器です。
        入力されたメニュー名を、指定された core_key と register のみに分類してください。
        出力は JSON だけを返してください。余計な説明は禁止です。

        JSON schema:
        {
          "core_key": "<string>",
          "register": "<falsetto|chest|mixed|unspecified>",
          "confidence": <0.0-1.0 number>
        }

        core_key は次から必ず選択:
        #{allowed_core_keys.join(", ")}
        どれにも当てはまらない場合は "unknown"。
      SYS

      user_text = <<~USR
        menu_name: #{name}
        normalized_name: #{normalized_name}
      USR

      text = @client.generate_text!(
        user_text: user_text,
        system_text: system_text,
        max_output_tokens: 300,
        temperature: 0.0
      )

      parsed = extract_json(text)
      return nil unless parsed.is_a?(Hash)

      core_key = parsed["core_key"].to_s
      register = parsed["register"].to_s
      confidence = parsed["confidence"].to_f.clamp(0.0, 1.0)

      core_key = "unknown" unless allowed_core_keys.include?(core_key)
      register = "unspecified" unless allowed_registers.include?(register)
      return nil if core_key == "unknown" || confidence < APPLY_THRESHOLD

      {
        canonical_core_key: core_key,
        canonical_register: register,
        canonical_key: MenuCanonicalization::RuleEngine.build_key(core_key: core_key, register: register),
        canonical_confidence: confidence,
        canonical_source: "ai",
        canonical_version: MenuCanonicalization::RuleEngine::VERSION
      }
    rescue Gemini::Error
      nil
    rescue JSON::ParserError
      nil
    end

    private

    def extract_json(text)
      trimmed = text.to_s.strip
      return JSON.parse(trimmed) if trimmed.start_with?("{") && trimmed.end_with?("}")

      body = trimmed[/\{.*\}/m]
      return nil if body.blank?

      JSON.parse(body)
    end
  end
end
