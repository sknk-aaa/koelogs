class BackfillTrainingMenuCanonicalFields < ActiveRecord::Migration[8.0]
  class MigrationTrainingMenu < ActiveRecord::Base
    self.table_name = "training_menus"
  end

  class MigrationMenuAlias < ActiveRecord::Base
    self.table_name = "menu_aliases"
  end

  def up
    return unless table_exists?(:training_menus)

    say_with_time "Backfilling training_menus canonical fields" do
      MigrationTrainingMenu.find_each do |menu|
        result = MenuCanonicalization::RuleEngine.classify(name: menu.name)
        menu.update_columns(
          canonical_core_key: result.canonical_core_key,
          canonical_register: result.canonical_register,
          canonical_key: result.canonical_key,
          canonical_confidence: result.canonical_confidence,
          canonical_source: result.canonical_source,
          canonical_version: result.canonical_version
        )

        next if result.canonical_core_key == "unknown" || result.normalized_name.blank?

        now = Time.current
        row = MigrationMenuAlias.find_by(normalized_name: result.normalized_name)
        if row
          incoming_conf = result.canonical_confidence.to_f
          if row.source != "manual" && (incoming_conf >= row.confidence.to_f || row.canonical_key.blank?)
            row.update_columns(
              canonical_key: result.canonical_key,
              confidence: incoming_conf,
              source: result.canonical_source,
              last_seen_at: now,
              updated_at: now
            )
          else
            row.update_columns(last_seen_at: now, updated_at: now)
          end
        else
          MigrationMenuAlias.create!(
            normalized_name: result.normalized_name,
            canonical_key: result.canonical_key,
            confidence: result.canonical_confidence,
            source: result.canonical_source,
            first_seen_at: now,
            last_seen_at: now
          )
        end
      end
    end
  end

  def down
    # no-op
  end
end
