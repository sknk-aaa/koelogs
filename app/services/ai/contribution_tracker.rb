# frozen_string_literal: true

module Ai
  class ContributionTracker
    def initialize(ai_recommendation:, collective_effects:)
      @ai_recommendation = ai_recommendation
      @collective_effects = collective_effects
    end

    def record!
      return unless collective_label_present?

      contributor_ids = extract_contributor_user_ids
      return if contributor_ids.empty?

      contributor_ids.each do |user_id|
        AiContributionEvent.create_or_find_by!(
          user_id: user_id,
          ai_recommendation_id: @ai_recommendation.id
        )
      end
    end

    private

    def extract_contributor_user_ids
      rows = Array(@collective_effects[:rows])
      ids = rows.flat_map do |row|
        Array(row[:top_menus]).flat_map { |menu| Array(menu[:contributor_user_ids]) }
      end

      ids.filter_map { |v| Integer(v, exception: false) }.select(&:positive?).uniq
    end

    def collective_label_present?
      text = @ai_recommendation.recommendation_text.to_s
      text.include?("出典: 全体傾向") || text.include?("コミュニティから")
    end
  end
end
