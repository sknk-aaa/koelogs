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

ActiveRecord::Schema[8.1].define(version: 2026_02_20_190000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "ai_contribution_events", force: :cascade do |t|
    t.bigint "ai_recommendation_id", null: false
    t.string "canonical_key"
    t.datetime "created_at", null: false
    t.jsonb "improvement_tags", default: [], null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["ai_recommendation_id"], name: "index_ai_contribution_events_on_ai_recommendation_id"
    t.index ["user_id", "ai_recommendation_id"], name: "idx_ai_contrib_unique_user_recommendation", unique: true
    t.index ["user_id"], name: "index_ai_contribution_events_on_user_id"
  end

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

  create_table "analysis_menus", force: :cascade do |t|
    t.boolean "archived", default: false, null: false
    t.boolean "compare_by_scale", default: false, null: false
    t.boolean "compare_by_tempo", default: false, null: false
    t.string "compare_mode", default: "flexible", null: false
    t.datetime "created_at", null: false
    t.string "fixed_scale_type"
    t.integer "fixed_tempo"
    t.text "focus_points"
    t.string "name", null: false
    t.jsonb "selected_metrics", default: [], null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["selected_metrics"], name: "index_analysis_menus_on_selected_metrics", using: :gin
    t.index ["user_id", "archived"], name: "index_analysis_menus_on_user_id_and_archived"
    t.index ["user_id", "name"], name: "index_analysis_menus_on_user_id_and_name", unique: true
    t.index ["user_id"], name: "index_analysis_menus_on_user_id"
  end

  create_table "analysis_sessions", force: :cascade do |t|
    t.bigint "analysis_menu_id", null: false
    t.integer "audio_byte_size"
    t.string "audio_content_type"
    t.string "audio_path"
    t.datetime "created_at", null: false
    t.integer "duration_sec", default: 0, null: false
    t.text "feedback_text"
    t.string "peak_note"
    t.integer "pitch_stability_score"
    t.integer "range_semitones"
    t.jsonb "raw_metrics", default: {}, null: false
    t.string "recorded_scale_type"
    t.integer "recorded_tempo"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.integer "voice_consistency_score"
    t.index ["analysis_menu_id", "recorded_scale_type", "recorded_tempo", "created_at"], name: "idx_analysis_sessions_compare_key"
    t.index ["analysis_menu_id"], name: "index_analysis_sessions_on_analysis_menu_id"
    t.index ["user_id", "analysis_menu_id", "created_at"], name: "idx_on_user_id_analysis_menu_id_created_at_09a97c749f"
    t.index ["user_id"], name: "index_analysis_sessions_on_user_id"
  end

  create_table "community_post_favorites", force: :cascade do |t|
    t.bigint "community_post_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["community_post_id", "created_at"], name: "idx_on_community_post_id_created_at_f99b0b2bc7"
    t.index ["community_post_id"], name: "index_community_post_favorites_on_community_post_id"
    t.index ["user_id", "community_post_id"], name: "idx_community_post_favorites_unique", unique: true
    t.index ["user_id"], name: "index_community_post_favorites_on_user_id"
  end

  create_table "community_posts", force: :cascade do |t|
    t.string "canonical_key", null: false
    t.text "comment"
    t.datetime "created_at", null: false
    t.integer "effect_level", null: false
    t.jsonb "improvement_tags", default: [], null: false
    t.date "practiced_on"
    t.boolean "published", default: true, null: false
    t.bigint "training_menu_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["canonical_key", "created_at"], name: "index_community_posts_on_canonical_key_and_created_at"
    t.index ["published", "created_at"], name: "index_community_posts_on_published_and_created_at"
    t.index ["training_menu_id"], name: "index_community_posts_on_training_menu_id"
    t.index ["user_id", "created_at"], name: "index_community_posts_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_community_posts_on_user_id"
  end

  create_table "menu_aliases", force: :cascade do |t|
    t.string "canonical_key", null: false
    t.decimal "confidence", precision: 4, scale: 3, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.datetime "first_seen_at", null: false
    t.datetime "last_seen_at", null: false
    t.string "normalized_name", null: false
    t.string "source", default: "rule", null: false
    t.datetime "updated_at", null: false
    t.index ["canonical_key"], name: "index_menu_aliases_on_canonical_key"
    t.index ["normalized_name"], name: "index_menu_aliases_on_normalized_name", unique: true
  end

  create_table "scale_tracks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "file_path"
    t.string "scale_type"
    t.integer "tempo"
    t.datetime "updated_at", null: false
  end

  create_table "training_log_feedbacks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "effective_menu_ids", default: [], null: false
    t.jsonb "improvement_tags", default: [], null: false
    t.jsonb "menu_effects", default: [], null: false
    t.bigint "training_log_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["training_log_id"], name: "index_training_log_feedbacks_on_training_log_id", unique: true
    t.index ["user_id"], name: "index_training_log_feedbacks_on_user_id"
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
    t.decimal "canonical_confidence", precision: 4, scale: 3, default: "0.0", null: false
    t.string "canonical_core_key", default: "unknown", null: false
    t.string "canonical_key", default: "unknown|unspecified", null: false
    t.string "canonical_register", default: "unspecified", null: false
    t.string "canonical_source", default: "rule", null: false
    t.integer "canonical_version", default: 1, null: false
    t.string "color", default: "#DDEBFF", null: false
    t.datetime "created_at", null: false
    t.text "focus_points"
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["canonical_key"], name: "index_training_menus_on_canonical_key"
    t.index ["id", "user_id"], name: "idx_training_menus_id_user", unique: true
    t.index ["user_id", "archived"], name: "index_training_menus_on_user_id_and_archived"
    t.index ["user_id", "canonical_key"], name: "index_training_menus_on_user_id_and_canonical_key"
    t.index ["user_id", "name"], name: "index_training_menus_on_user_id_and_name", unique: true
    t.index ["user_id"], name: "index_training_menus_on_user_id"
  end

  create_table "user_badges", force: :cascade do |t|
    t.string "badge_key", null: false
    t.datetime "created_at", null: false
    t.datetime "unlocked_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "badge_key"], name: "index_user_badges_on_user_id_and_badge_key", unique: true
    t.index ["user_id", "unlocked_at"], name: "index_user_badges_on_user_id_and_unlocked_at"
    t.index ["user_id"], name: "index_user_badges_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "avatar_icon", default: "note_blue", null: false
    t.text "avatar_image_url"
    t.datetime "created_at", null: false
    t.string "display_name"
    t.string "email", null: false
    t.string "goal_text", limit: 50
    t.string "password_digest", null: false
    t.datetime "password_reset_sent_at"
    t.string "password_reset_token_digest"
    t.boolean "public_goal_enabled", default: false, null: false
    t.boolean "public_profile_enabled", default: false, null: false
    t.boolean "ranking_participation_enabled", default: false, null: false
    t.datetime "updated_at", null: false
    t.index ["avatar_icon"], name: "index_users_on_avatar_icon"
    t.index ["display_name"], name: "index_users_on_display_name"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["password_reset_token_digest"], name: "index_users_on_password_reset_token_digest", unique: true
  end

  create_table "weekly_logs", force: :cascade do |t|
    t.string "chest_top_note"
    t.datetime "created_at", null: false
    t.jsonb "effect_feedbacks", default: [], null: false
    t.string "falsetto_top_note"
    t.text "notes"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.date "week_start", null: false
    t.index ["user_id", "week_start"], name: "index_weekly_logs_on_user_id_and_week_start", unique: true
    t.index ["user_id"], name: "index_weekly_logs_on_user_id"
  end

  create_table "xp_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "points", null: false
    t.string "rule_key", null: false
    t.bigint "source_id", null: false
    t.string "source_type", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "created_at"], name: "index_xp_events_on_user_id_and_created_at"
    t.index ["user_id", "rule_key", "source_type", "source_id"], name: "idx_xp_events_unique_source", unique: true
    t.index ["user_id"], name: "index_xp_events_on_user_id"
  end

  add_foreign_key "ai_contribution_events", "ai_recommendations"
  add_foreign_key "ai_contribution_events", "users"
  add_foreign_key "ai_recommendations", "users"
  add_foreign_key "analysis_menus", "users"
  add_foreign_key "analysis_sessions", "analysis_menus"
  add_foreign_key "analysis_sessions", "users"
  add_foreign_key "community_post_favorites", "community_posts"
  add_foreign_key "community_post_favorites", "users"
  add_foreign_key "community_posts", "training_menus"
  add_foreign_key "community_posts", "users"
  add_foreign_key "training_log_feedbacks", "training_logs"
  add_foreign_key "training_log_feedbacks", "users"
  add_foreign_key "training_log_menus", "training_logs", column: ["training_log_id", "user_id"], primary_key: ["id", "user_id"], name: "fk_tlm_logs_same_user", on_delete: :cascade
  add_foreign_key "training_log_menus", "training_menus", column: ["training_menu_id", "user_id"], primary_key: ["id", "user_id"], name: "fk_tlm_menus_same_user", on_delete: :restrict
  add_foreign_key "training_log_menus", "users"
  add_foreign_key "training_logs", "users"
  add_foreign_key "training_menus", "users"
  add_foreign_key "user_badges", "users"
  add_foreign_key "weekly_logs", "users"
  add_foreign_key "xp_events", "users"
end
