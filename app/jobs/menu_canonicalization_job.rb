class MenuCanonicalizationJob < ApplicationJob
  queue_as :default

  def perform(training_menu_id)
    menu = TrainingMenu.find_by(id: training_menu_id)
    return if menu.nil?
    return if menu.canonical_source == "manual"

    normalized_name = MenuCanonicalization::RuleEngine.normalize_name(menu.name)
    ai_result = MenuCanonicalization::AiResolver.new.resolve(
      name: menu.name,
      normalized_name: normalized_name
    )
    return if ai_result.nil?

    menu.update_columns(
      canonical_core_key: ai_result[:canonical_core_key],
      canonical_register: ai_result[:canonical_register],
      canonical_key: ai_result[:canonical_key],
      canonical_confidence: ai_result[:canonical_confidence],
      canonical_source: ai_result[:canonical_source],
      canonical_version: ai_result[:canonical_version],
      updated_at: Time.current
    )

    MenuCanonicalization::AliasStore.upsert!(
      normalized_name: normalized_name,
      canonical_key: ai_result[:canonical_key],
      confidence: ai_result[:canonical_confidence],
      source: ai_result[:canonical_source]
    )
  end
end
