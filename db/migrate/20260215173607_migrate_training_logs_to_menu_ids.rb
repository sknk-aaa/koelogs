# db/migrate/20260216000000_migrate_training_logs_to_menu_ids.rb
class MigrateTrainingLogsToMenuIds < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def up
    create_table :training_log_menus do |t|
      t.bigint :user_id, null: false
      t.bigint :training_log_id, null: false
      t.bigint :training_menu_id, null: false
      t.datetime :created_at, null: false
    end

    add_index :training_log_menus, [ :training_log_id, :training_menu_id ],
              unique: true, algorithm: :concurrently, name: "idx_training_log_menus_unique"
    add_index :training_log_menus, :user_id, algorithm: :concurrently
    add_index :training_log_menus, [ :user_id, :training_log_id ], algorithm: :concurrently
    add_index :training_log_menus, [ :user_id, :training_menu_id ], algorithm: :concurrently

    # (id,user_id) を参照したいので UNIQUE を追加（PKがidでも複合FKには必要）
    add_index :training_logs, [ :id, :user_id ], unique: true,
              name: "idx_training_logs_id_user", algorithm: :concurrently
    add_index :training_menus, [ :id, :user_id ], unique: true,
              name: "idx_training_menus_id_user", algorithm: :concurrently

    add_foreign_key :training_log_menus, :users, column: :user_id

    # 複合FKは SQL で
    execute <<~SQL
      ALTER TABLE training_log_menus
        ADD CONSTRAINT fk_tlm_logs_same_user
        FOREIGN KEY (training_log_id, user_id)
        REFERENCES training_logs (id, user_id)
        ON DELETE CASCADE;
    SQL

    execute <<~SQL
      ALTER TABLE training_log_menus
        ADD CONSTRAINT fk_tlm_menus_same_user
        FOREIGN KEY (training_menu_id, user_id)
        REFERENCES training_menus (id, user_id)
        ON DELETE RESTRICT;
    SQL

    say_with_time "Backfill training_log_menus from training_logs.menus" do
      backfill!
    end

    if index_exists?(:training_logs, :menus, name: "index_training_logs_on_menus")
      remove_index :training_logs, name: "index_training_logs_on_menus"
    end
    remove_column :training_logs, :menus, :jsonb if column_exists?(:training_logs, :menus)
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Down is not supported for safety (data may be huge)."
  end

  private

  def backfill!
    return unless column_exists?(:training_logs, :menus)

    conn = ActiveRecord::Base.connection
    now = Time.current
    default_color = "#DDEBFF"

    # { [user_id, lower_name] => training_menu_id }
    menu_cache = {}

    insert_rows = []

    conn.exec_query(<<~SQL).each do |row|
      SELECT id, user_id, menus
      FROM training_logs
      WHERE menus IS NOT NULL
    SQL
      log_id = row["id"].to_i
      user_id = row["user_id"].to_i
      menus = row["menus"]

      names =
        case menus
        when Array then menus
        when String
          begin
            v = JSON.parse(menus)
            v.is_a?(Array) ? v : []
          rescue
            []
          end
        else
          []
        end

      names.map { |x| x.to_s.strip }.reject(&:empty?).uniq.each do |name|
        key = [ user_id, name.downcase ]
        menu_id = menu_cache[key]

        if menu_id.nil?
          q_uid  = conn.quote(user_id)
          q_lnm  = conn.quote(name.downcase)

          found = conn.exec_query(<<~SQL).first
            SELECT id
            FROM training_menus
            WHERE user_id = #{q_uid} AND LOWER(name) = #{q_lnm}
            LIMIT 1
          SQL

          if found
            menu_id = found["id"].to_i
          else
            q_name  = conn.quote(name)
            q_color = conn.quote(default_color)
            q_now   = conn.quote(now)

            menu_id = conn.exec_query(<<~SQL).first["id"].to_i
              INSERT INTO training_menus (user_id, name, color, archived, created_at, updated_at)
              VALUES (#{q_uid}, #{q_name}, #{q_color}, TRUE, #{q_now}, #{q_now})
              RETURNING id
            SQL
          end

          menu_cache[key] = menu_id
        end

        insert_rows << {
          "user_id" => user_id,
          "training_log_id" => log_id,
          "training_menu_id" => menu_id,
          "created_at" => now
        }

        if insert_rows.size >= 1000
          bulk_insert!(insert_rows)
          insert_rows.clear
        end
      end
    end

    bulk_insert!(insert_rows) if insert_rows.any?
  end

  def bulk_insert!(rows)
    conn = ActiveRecord::Base.connection
    cols = %w[user_id training_log_id training_menu_id created_at]

    values_sql = rows.map do |r|
      "(#{cols.map { |c| conn.quote(r[c]) }.join(",")})"
    end.join(",")

    conn.execute <<~SQL
      INSERT INTO training_log_menus (#{cols.join(",")})
      VALUES #{values_sql}
      ON CONFLICT (training_log_id, training_menu_id) DO NOTHING
    SQL
  end
end
