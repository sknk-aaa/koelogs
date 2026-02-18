# frozen_string_literal: true

module Ai
  class CollectiveEffectSummary
    def initialize(window_days: 90, min_count: 3)
      @window_days = window_days
      @min_count = min_count
    end

    # return:
    # {
    #   window_days: 90,
    #   min_count: 3,
    #   rows: [ { tag_key:, tag_label:, top_menus: [ { canonical_key:, display_label:, count: } ] } ]
    # }
    def build
      from = @window_days.days.ago
      feedbacks = TrainingLogFeedback.includes(training_log: :training_menus)
                                     .where("training_log_feedbacks.created_at >= ?", from)
      counts = Hash.new { |h, k| h[k] = Hash.new(0) }

      feedbacks.find_each do |feedback|
        menus_by_id = feedback.training_log.training_menus.index_by(&:id)
        effects = normalized_effects(feedback)
        next if effects.empty?

        effects.each do |effect|
          canonical_key = menus_by_id[effect[:menu_id]]&.canonical_key.to_s.presence || "unknown|unspecified"
          next if canonical_key.start_with?("unknown")

          effect[:improvement_tags].each do |tag|
            next unless TrainingLogFeedback::IMPROVEMENT_TAGS.include?(tag)

            counts[tag][canonical_key] += 1
          end
        end
      end

      rows = counts.map do |tag, menu_count|
        sorted = menu_count
                 .select { |_canonical_key, count| count >= @min_count }
                 .sort_by { |(_canonical_key, count)| -count }
                 .first(3)
                 .map do |canonical_key, count|
          {
            canonical_key: canonical_key,
            display_label: MenuCanonicalization::RuleEngine.label_for_key(canonical_key),
            count: count
          }
        end
        next if sorted.empty?

        {
          tag_key: tag,
          tag_label: TrainingLogFeedback::TAG_LABELS[tag] || tag,
          top_menus: sorted
        }
      end.compact

      {
        window_days: @window_days,
        min_count: @min_count,
        rows: rows.sort_by { |r| -r[:top_menus].sum { |m| m[:count] } }
      }
    end

    private

    def normalized_effects(feedback)
      if feedback.menu_effects.present?
        return Array(feedback.menu_effects).filter_map do |entry|
          menu_id = Integer(entry["menu_id"] || entry[:menu_id], exception: false)
          next unless menu_id&.positive?

          tags = Array(entry["improvement_tags"] || entry[:improvement_tags]).map(&:to_s).map(&:strip).reject(&:blank?).uniq
          next if tags.empty?

          { menu_id: menu_id, improvement_tags: tags }
        end
      end

      tags = Array(feedback.improvement_tags).map(&:to_s).map(&:strip).reject(&:blank?).uniq
      return [] if tags.empty?

      Array(feedback.effective_menu_ids).filter_map do |menu_id|
        id = Integer(menu_id, exception: false)
        next unless id&.positive?

        { menu_id: id, improvement_tags: tags }
      end
    end
  end
end
