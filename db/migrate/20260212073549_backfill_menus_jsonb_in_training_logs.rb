class BackfillMenusJsonbInTrainingLogs < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def up
    say_with_time "Backfilling training_logs.menus_jsonb from menus(text)" do
      TrainingLog.reset_column_information

      TrainingLog.find_each do |log|
        raw = log.read_attribute(:menus)

        parsed =
          begin
            v = raw.present? ? JSON.parse(raw) : []
            v.is_a?(Array) ? v : []
          rescue JSON::ParserError
            []
          end

        log.update_columns(menus_jsonb: parsed)
      end
    end
  end
  def down
    # no-op
  end
end

class TrainingLog < ApplicationRecord
  self.table_name = "training_logs"
end
