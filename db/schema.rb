# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_02_16_130620) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "ai_recommendations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "generated_for_date", null: false
    t.integer "range_days", default: 7, null: false
    t.text "recommendation_text", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "generated_for_date"], name: "index_ai_recommendations_on_user_id_and_generated_for_date", unique: true
    t.index ["user_id"], name: "index_ai_recommendations_on_user_id"
  end

  create_table "scale_tracks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "file_path"
    t.string "scale_type"
    t.integer "tempo"
    t.datetime "updated_at", null: false
  end

  create_table "training_log_menus", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "training_log_id", null: false
    t.bigint "training_menu_id", null: false
    t.bigint "user_id", null: false
    t.index ["training_log_id", "training_menu_id"], name: "idx_training_log_menus_unique", unique: true
    t.index ["user_id", "training_log_id"], name: "index_training_log_menus_on_user_id_and_training_log_id"
    t.index ["user_id", "training_menu_id"], name: "index_training_log_menus_on_user_id_and_training_menu_id"
    t.index ["user_id"], name: "index_training_log_menus_on_user_id"
  end

  create_table "training_logs", force: :cascade do |t|
    t.string "chest_top_note"
    t.datetime "created_at", null: false
    t.integer "duration_min"
    t.string "falsetto_top_note"
    t.text "notes"
    t.date "practiced_on"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["id", "user_id"], name: "idx_training_logs_id_user", unique: true
    t.index ["user_id", "practiced_on"], name: "index_training_logs_on_user_id_and_practiced_on", unique: true
    t.index ["user_id"], name: "index_training_logs_on_user_id"
  end

  create_table "training_menus", force: :cascade do |t|
    t.boolean "archived", default: false, null: false
    t.string "color", default: "#DDEBFF", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["id", "user_id"], name: "idx_training_menus_id_user", unique: true
    t.index ["user_id", "archived"], name: "index_training_menus_on_user_id_and_archived"
    t.index ["user_id", "name"], name: "index_training_menus_on_user_id_and_name", unique: true
    t.index ["user_id"], name: "index_training_menus_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "display_name"
    t.string "email", null: false
    t.string "goal_text", limit: 50
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["display_name"], name: "index_users_on_display_name"
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "ai_recommendations", "users"
  add_foreign_key "training_log_menus", "training_logs", column: ["training_log_id", "user_id"], primary_key: ["id", "user_id"], name: "fk_tlm_logs_same_user", on_delete: :cascade
  add_foreign_key "training_log_menus", "training_menus", column: ["training_menu_id", "user_id"], primary_key: ["id", "user_id"], name: "fk_tlm_menus_same_user", on_delete: :restrict
  add_foreign_key "training_log_menus", "users"
  add_foreign_key "training_logs", "users"
  add_foreign_key "training_menus", "users"
end
