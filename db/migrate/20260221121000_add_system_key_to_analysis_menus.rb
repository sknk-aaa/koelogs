class AddSystemKeyToAnalysisMenus < ActiveRecord::Migration[7.1]
  def up
    add_column :analysis_menus, :system_key, :string

    execute <<~SQL
      UPDATE analysis_menus
      SET system_key = CASE name
        WHEN '裏声最高音測定' THEN 'falsetto_peak'
        WHEN '地声最高音測定' THEN 'chest_peak'
        WHEN '音域測定' THEN 'range'
        WHEN 'ロングトーン測定' THEN 'long_tone'
        WHEN '音程正確性測定（固定）' THEN 'pitch_accuracy'
        WHEN '音量安定性測定（固定）' THEN 'volume_stability'
        ELSE NULL
      END
    SQL

    say_with_time "Backfilling system_key for non-preset analysis_menus" do
      execute <<~SQL
        UPDATE analysis_menus
        SET system_key = 'custom_' || id
        WHERE system_key IS NULL OR btrim(system_key) = ''
      SQL
    end

    change_column_null :analysis_menus, :system_key, false
    add_index :analysis_menus, [ :user_id, :system_key ], unique: true
  end

  def down
    remove_index :analysis_menus, column: [ :user_id, :system_key ]
    remove_column :analysis_menus, :system_key, :string
  end
end
