# frozen_string_literal: true

class MigrateImprovementTagsToNewCatalog < ActiveRecord::Migration[8.1]
  LEGACY_CASE_SQL = <<~SQL.squish.freeze
    CASE value
      WHEN 'high_note_ease' THEN 'mixed_voice_stability'
      WHEN 'pitch_stability' THEN 'pitch_accuracy'
      WHEN 'passaggio_smoothness' THEN 'mixed_voice_stability'
      WHEN 'less_breathlessness' THEN 'breath_sustain'
      WHEN 'resonance_clarity' THEN 'vocal_cord_closure'
      ELSE value
    END
  SQL

  def up
    migrate_jsonb_array!("users", "ai_improvement_tags")
    migrate_jsonb_array!("community_posts", "improvement_tags")
  end

  def down
    # irreversible (semantic migration)
  end

  private

  def migrate_jsonb_array!(table, column)
    execute <<~SQL.squish
      WITH mapped AS (
        SELECT
          id,
          COALESCE(
            (
              SELECT jsonb_agg(tag ORDER BY ord)
              FROM (
                SELECT DISTINCT ON (mapped_tag) mapped_tag AS tag, ord
                FROM (
                  SELECT
                    ord,
                    #{LEGACY_CASE_SQL} AS mapped_tag
                  FROM jsonb_array_elements_text(#{table}.#{column}) WITH ORDINALITY AS t(value, ord)
                ) s
                WHERE mapped_tag IS NOT NULL AND mapped_tag <> ''
                ORDER BY mapped_tag, ord
              ) d
            ),
            '[]'::jsonb
          ) AS new_tags
        FROM #{table}
      )
      UPDATE #{table}
      SET #{column} = mapped.new_tags
      FROM mapped
      WHERE #{table}.id = mapped.id
    SQL
  end
end
