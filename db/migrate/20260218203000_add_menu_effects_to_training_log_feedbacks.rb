class AddMenuEffectsToTrainingLogFeedbacks < ActiveRecord::Migration[8.0]
  class MigrationTrainingLogFeedback < ActiveRecord::Base
    self.table_name = "training_log_feedbacks"
  end

  def up
    add_column :training_log_feedbacks, :menu_effects, :jsonb, null: false, default: []

    MigrationTrainingLogFeedback.reset_column_information
    say_with_time "Backfilling menu_effects from effective_menu_ids and improvement_tags" do
      MigrationTrainingLogFeedback.find_each do |row|
        menu_ids = Array(row.effective_menu_ids).filter_map { |v| Integer(v, exception: false) }.select(&:positive?).uniq
        tags = Array(row.improvement_tags).map(&:to_s).map(&:strip).reject(&:blank?).uniq
        effects = menu_ids.map { |menu_id| { "menu_id" => menu_id, "improvement_tags" => tags } }
        row.update_columns(menu_effects: effects)
      end
    end
  end

  def down
    remove_column :training_log_feedbacks, :menu_effects, :jsonb
  end
end
