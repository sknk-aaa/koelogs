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

ActiveRecord::Schema[8.1].define(version: 2026_03_13_133000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "ai_chat_messages", force: :cascade do |t|
    t.bigint "ai_chat_thread_id", null: false
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.string "role", null: false
    t.datetime "updated_at", null: false
    t.index ["ai_chat_thread_id", "created_at"], name: "index_ai_chat_messages_on_thread_and_created"
    t.index ["ai_chat_thread_id"], name: "index_ai_chat_messages_on_ai_chat_thread_id"
  end

  create_table "ai_chat_projects", force: :cascade do |t|
    t.boolean "archived", default: false, null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "name"], name: "index_ai_chat_projects_on_user_id_and_name"
    t.index ["user_id"], name: "index_ai_chat_projects_on_user_id"
  end

  create_table "ai_chat_threads", force: :cascade do |t|
    t.bigint "ai_chat_project_id"
    t.datetime "created_at", null: false
    t.datetime "last_message_at", null: false
    t.string "llm_model_name", null: false
    t.date "source_date"
    t.string "source_kind"
    t.string "system_prompt_version", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.string "user_prompt_version", null: false
    t.index ["ai_chat_project_id", "last_message_at"], name: "index_ai_chat_threads_on_project_and_last_message"
    t.index ["ai_chat_project_id"], name: "index_ai_chat_threads_on_ai_chat_project_id"
    t.index ["user_id", "last_message_at"], name: "index_ai_chat_threads_on_user_id_and_last_message_at"
    t.index ["user_id", "source_kind", "source_date"], name: "index_ai_chat_threads_on_user_ai_reco_source", unique: true, where: "(((source_kind)::text = 'ai_recommendation'::text) AND (source_date IS NOT NULL))"
    t.index ["user_id"], name: "index_ai_chat_threads_on_user_id"
  end

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

  create_table "ai_profile_memory_candidates", force: :cascade do |t|
    t.text "candidate_text", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.datetime "resolved_at"
    t.string "resolved_destination"
    t.string "source_kind", default: "ai_chat", null: false
    t.bigint "source_message_id"
    t.text "source_text", null: false
    t.bigint "source_thread_id"
    t.string "status", default: "pending", null: false
    t.string "suggested_destination", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "created_at"], name: "idx_ai_memory_candidates_user_created"
    t.index ["user_id", "status", "expires_at"], name: "idx_ai_memory_candidates_user_status_expires"
    t.index ["user_id"], name: "index_ai_profile_memory_candidates_on_user_id"
  end

  create_table "ai_recommendation_messages", force: :cascade do |t|
    t.bigint "ai_recommendation_thread_id", null: false
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.string "role", null: false
    t.datetime "updated_at", null: false
    t.index ["ai_recommendation_thread_id", "created_at"], name: "index_ai_reco_msgs_on_thread_and_created"
    t.index ["ai_recommendation_thread_id"], name: "index_ai_reco_msgs_on_thread_id"
  end

  create_table "ai_recommendation_threads", force: :cascade do |t|
    t.bigint "ai_recommendation_id", null: false
    t.jsonb "context_snapshot", default: {}, null: false
    t.datetime "created_at", null: false
    t.date "generated_for_date", null: false
    t.string "llm_model_name", default: "gemini-2.5-flash", null: false
    t.text "seed_recommendation_text", null: false
    t.string "system_prompt_version", default: "followup-v1", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.string "user_prompt_version", default: "followup-v1", null: false
    t.index ["ai_recommendation_id"], name: "index_ai_recommendation_threads_on_ai_recommendation_id", unique: true
    t.index ["user_id", "generated_for_date"], name: "index_ai_reco_threads_on_user_and_date"
    t.index ["user_id"], name: "index_ai_recommendation_threads_on_user_id"
  end

  create_table "ai_recommendations", force: :cascade do |t|
    t.jsonb "collective_summary", default: {}, null: false
    t.datetime "created_at", null: false
    t.date "generated_for_date", null: false
    t.jsonb "generation_context", default: {}, null: false
    t.string "generator_model_name", default: "gemini-2.5-flash", null: false
    t.string "generator_prompt_version", default: "recommendation-v1", null: false
    t.integer "range_days", default: 7, null: false
    t.text "recommendation_text", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.date "week_start_date", null: false
    t.index ["user_id", "generated_for_date", "range_days"], name: "index_ai_recommendations_on_user_id_date_range_days", unique: true
    t.index ["user_id", "week_start_date", "range_days", "generated_for_date"], name: "index_ai_recommendations_on_user_week_range_and_generated_on"
    t.index ["user_id"], name: "index_ai_recommendations_on_user_id"
  end

  create_table "ai_token_usages", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "feature", null: false
    t.integer "input_tokens", default: 0, null: false
    t.string "llm_model_name"
    t.integer "output_tokens", default: 0, null: false
    t.integer "total_tokens", default: 0, null: false
    t.datetime "updated_at", null: false
    t.datetime "used_at", null: false
    t.bigint "user_id", null: false
    t.date "year_month", null: false
    t.index ["used_at"], name: "index_ai_token_usages_on_used_at"
    t.index ["user_id", "feature", "year_month"], name: "index_ai_token_usages_on_user_feature_month"
    t.index ["user_id", "year_month"], name: "index_ai_token_usages_on_user_id_and_year_month"
    t.index ["user_id"], name: "index_ai_token_usages_on_user_id"
  end

  create_table "ai_user_profiles", force: :cascade do |t|
    t.jsonb "auto_profile", default: {}, null: false
    t.datetime "computed_at"
    t.datetime "created_at", null: false
    t.text "last_error"
    t.datetime "overrides_updated_at"
    t.string "source_fingerprint"
    t.jsonb "source_meta", default: {}, null: false
    t.integer "source_window_days", default: 90, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.jsonb "user_overrides", default: {}, null: false
    t.index ["user_id"], name: "index_ai_user_profiles_on_user_id", unique: true
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
    t.string "used_scale_other_text"
    t.string "used_scale_type", default: "other", null: false
    t.bigint "user_id", null: false
    t.index ["canonical_key", "created_at"], name: "index_community_posts_on_canonical_key_and_created_at"
    t.index ["published", "created_at"], name: "index_community_posts_on_published_and_created_at"
    t.index ["training_menu_id"], name: "index_community_posts_on_training_menu_id"
    t.index ["user_id", "created_at"], name: "index_community_posts_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_community_posts_on_user_id"
  end

  create_table "measurement_long_tone_results", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "measurement_run_id", null: false
    t.string "sustain_note"
    t.decimal "sustain_sec", precision: 8, scale: 2, null: false
    t.datetime "updated_at", null: false
    t.index ["measurement_run_id"], name: "index_measurement_long_tone_results_on_measurement_run_id", unique: true
  end

  create_table "measurement_pitch_accuracy_results", force: :cascade do |t|
    t.decimal "accuracy_score", precision: 8, scale: 3
    t.decimal "avg_cents_error", precision: 8, scale: 3
    t.datetime "created_at", null: false
    t.bigint "measurement_run_id", null: false
    t.integer "note_count"
    t.datetime "updated_at", null: false
    t.index ["measurement_run_id"], name: "index_measurement_pitch_accuracy_results_on_measurement_run_id", unique: true
  end

  create_table "measurement_range_results", force: :cascade do |t|
    t.string "chest_top_note"
    t.datetime "created_at", null: false
    t.string "falsetto_top_note"
    t.string "highest_note"
    t.string "lowest_note"
    t.bigint "measurement_run_id", null: false
    t.decimal "range_octaves", precision: 6, scale: 2
    t.integer "range_semitones"
    t.datetime "updated_at", null: false
    t.index ["measurement_run_id"], name: "index_measurement_range_results_on_measurement_run_id", unique: true
  end

  create_table "measurement_runs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "include_in_insights", default: true, null: false
    t.string "measurement_type", null: false
    t.datetime "recorded_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "include_in_insights", "measurement_type", "recorded_at"], name: "idx_measurement_runs_insights_filter"
    t.index ["user_id", "measurement_type", "recorded_at"], name: "idx_measurement_runs_user_type_recorded"
    t.index ["user_id"], name: "index_measurement_runs_on_user_id"
  end

  create_table "measurement_volume_stability_results", force: :cascade do |t|
    t.decimal "avg_loudness_db", precision: 8, scale: 3
    t.datetime "created_at", null: false
    t.decimal "loudness_range_db", precision: 8, scale: 3
    t.decimal "loudness_range_pct", precision: 8, scale: 3
    t.decimal "loudness_range_ratio", precision: 10, scale: 6
    t.decimal "max_loudness_db", precision: 8, scale: 3
    t.bigint "measurement_run_id", null: false
    t.decimal "min_loudness_db", precision: 8, scale: 3
    t.datetime "updated_at", null: false
    t.index ["measurement_run_id"], name: "idx_on_measurement_run_id_531d0f2840", unique: true
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

  create_table "monthly_logs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "month_start", null: false
    t.text "notes"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "month_start"], name: "index_monthly_logs_on_user_id_and_month_start", unique: true
    t.index ["user_id"], name: "index_monthly_logs_on_user_id"
  end

  create_table "scale_tracks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "file_path"
    t.string "range_type", default: "mid", null: false
    t.string "scale_type"
    t.integer "tempo"
    t.datetime "updated_at", null: false
    t.index ["scale_type", "range_type"], name: "index_scale_tracks_on_scale_type_and_range_type"
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
    t.datetime "created_at", null: false
    t.integer "duration_min"
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
    t.text "ai_custom_instructions"
    t.jsonb "ai_improvement_tags", default: [], null: false
    t.jsonb "ai_response_style_prefs", default: {}, null: false
    t.string "avatar_icon", default: "note_blue", null: false
    t.text "avatar_image_url"
    t.string "billing_cycle"
    t.datetime "created_at", null: false
    t.string "display_name"
    t.string "email", null: false
    t.datetime "email_verification_sent_at"
    t.string "email_verification_token_digest"
    t.datetime "email_verified_at"
    t.string "goal_text", limit: 50
    t.string "google_sub"
    t.string "password_digest", null: false
    t.datetime "password_reset_sent_at"
    t.string "password_reset_token_digest"
    t.string "plan_tier", default: "free", null: false
    t.boolean "public_goal_enabled", default: false, null: false
    t.boolean "public_profile_enabled", default: false, null: false
    t.boolean "ranking_participation_enabled", default: false, null: false
    t.datetime "updated_at", null: false
    t.index ["avatar_icon"], name: "index_users_on_avatar_icon"
    t.index ["display_name"], name: "index_users_on_display_name"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["email_verification_token_digest"], name: "index_users_on_email_verification_token_digest", unique: true
    t.index ["email_verified_at"], name: "index_users_on_email_verified_at"
    t.index ["google_sub"], name: "index_users_on_google_sub", unique: true
    t.index ["password_reset_token_digest"], name: "index_users_on_password_reset_token_digest", unique: true
    t.index ["plan_tier"], name: "index_users_on_plan_tier"
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

  add_foreign_key "ai_chat_messages", "ai_chat_threads"
  add_foreign_key "ai_chat_projects", "users"
  add_foreign_key "ai_chat_threads", "ai_chat_projects"
  add_foreign_key "ai_chat_threads", "users"
  add_foreign_key "ai_contribution_events", "ai_recommendations"
  add_foreign_key "ai_contribution_events", "users"
  add_foreign_key "ai_profile_memory_candidates", "users"
  add_foreign_key "ai_recommendation_messages", "ai_recommendation_threads"
  add_foreign_key "ai_recommendation_threads", "ai_recommendations"
  add_foreign_key "ai_recommendation_threads", "users"
  add_foreign_key "ai_recommendations", "users"
  add_foreign_key "ai_token_usages", "users"
  add_foreign_key "ai_user_profiles", "users"
  add_foreign_key "community_post_favorites", "community_posts"
  add_foreign_key "community_post_favorites", "users"
  add_foreign_key "community_posts", "training_menus"
  add_foreign_key "community_posts", "users"
  add_foreign_key "measurement_long_tone_results", "measurement_runs"
  add_foreign_key "measurement_pitch_accuracy_results", "measurement_runs"
  add_foreign_key "measurement_range_results", "measurement_runs"
  add_foreign_key "measurement_runs", "users"
  add_foreign_key "measurement_volume_stability_results", "measurement_runs"
  add_foreign_key "monthly_logs", "users"
  add_foreign_key "training_log_menus", "training_logs", column: ["training_log_id", "user_id"], primary_key: ["id", "user_id"], name: "fk_tlm_logs_same_user", on_delete: :cascade
  add_foreign_key "training_log_menus", "training_menus", column: ["training_menu_id", "user_id"], primary_key: ["id", "user_id"], name: "fk_tlm_menus_same_user", on_delete: :restrict
  add_foreign_key "training_log_menus", "users"
  add_foreign_key "training_logs", "users"
  add_foreign_key "training_menus", "users"
  add_foreign_key "user_badges", "users"
  add_foreign_key "xp_events", "users"
end
