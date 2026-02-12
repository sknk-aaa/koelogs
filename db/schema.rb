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

ActiveRecord::Schema[8.1].define(version: 2026_02_12_070356) do
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
    t.text "menus"
    t.text "notes"
    t.date "practiced_on"
    t.datetime "updated_at", null: false
  end
end
