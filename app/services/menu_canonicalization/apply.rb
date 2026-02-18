# frozen_string_literal: true

module MenuCanonicalization
  class Apply
    def self.call(training_menu:)
      result = MenuCanonicalization::RuleEngine.classify(name: training_menu.name)

      training_menu.update_columns(
        canonical_core_key: result.canonical_core_key,
        canonical_register: result.canonical_register,
        canonical_key: result.canonical_key,
        canonical_confidence: result.canonical_confidence,
        canonical_source: result.canonical_source,
        canonical_version: result.canonical_version,
        updated_at: Time.current
      )

      if result.canonical_core_key != "unknown"
        MenuCanonicalization::AliasStore.upsert!(
          normalized_name: result.normalized_name,
          canonical_key: result.canonical_key,
          confidence: result.canonical_confidence,
          source: result.canonical_source
        )
      elsif result.low_confidence?
        MenuCanonicalizationJob.perform_later(training_menu.id)
      end
    end
  end
end
