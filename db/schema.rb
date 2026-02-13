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

ActiveRecord::Schema[8.1].define(version: 2026_02_13_140542) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "scale_tracks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "file_path"
    t.string "scale_type"
    t.integer "tempo"
    t.datetime "updated_at", null: false
  end

  create_table "training_logs", force: :cascade do |t|
    t.string "chest_top_note"
    t.datetime "created_at", null: false
    t.integer "duration_min"
    t.string "falsetto_top_note"
    t.jsonb "menus", default: [], null: false
    t.text "notes"
    t.date "practiced_on"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["menus"], name: "index_training_logs_on_menus", using: :gin
    t.index ["user_id", "practiced_on"], name: "index_training_logs_on_user_id_and_practiced_on", unique: true
    t.index ["user_id"], name: "index_training_logs_on_user_id"
  end

  create_table "training_menus", force: :cascade do |t|
    t.boolean "archived", default: false, null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "archived"], name: "index_training_menus_on_user_id_and_archived"
    t.index ["user_id", "name"], name: "index_training_menus_on_user_id_and_name", unique: true
    t.index ["user_id"], name: "index_training_menus_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "training_logs", "users"
  add_foreign_key "training_menus", "users"
end
