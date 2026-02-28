# frozen_string_literal: true

require "digest"

module Ai
  class UserLongTermProfileManager
    PROFILE_VERSION = "v1"
    PROFILE_MAX_CHARS = 1000

    class << self
      def refresh!(user:, force: false, window_days: AiUserProfile::WINDOW_DAYS)
        profile = user.ai_user_profile || user.build_ai_user_profile(source_window_days: window_days)
        source_meta = build_source_meta(user, window_days)
        fingerprint = build_fingerprint(user, source_meta, window_days)
        changed_sources = detect_changed_sources(profile.source_meta, source_meta)

        if !force && changed_sources.empty? && profile.source_fingerprint == fingerprint && profile.computed_at.present?
          return profile
        end

        auto_profile = build_auto_profile_with_ai(
          user: user,
          profile: profile,
          changed_sources: changed_sources,
          window_days: window_days
        )

        profile.assign_attributes(
          auto_profile: auto_profile,
          source_meta: source_meta,
          source_fingerprint: fingerprint,
          computed_at: Time.current,
          source_window_days: window_days,
          last_error: nil
        )
        profile.save!
        profile
      rescue => e
        profile&.update_columns(last_error: "#{e.class}: #{e.message}") if profile&.persisted?
        Rails.logger.warn("[AI][UserLongTermProfileManager] #{e.class}: #{e.message}")
        raise
      end

      def update_overrides!(user:, overrides:)
        profile = user.ai_user_profile || user.create_ai_user_profile!(source_window_days: AiUserProfile::WINDOW_DAYS)
        profile.update!(
          user_overrides: normalize_overrides(overrides),
          overrides_updated_at: Time.current
        )
        profile
      end

      def effective_profile(user:)
        return empty_profile if user.nil?

        profile = user.ai_user_profile
        return empty_profile unless profile

        auto = normalize_profile(profile.auto_profile)
        overrides = normalize_profile(profile.effective_overrides)
        merged = merge_profile(auto, overrides)
        merged["meta"] = {
          "profile_version" => PROFILE_VERSION,
          "source_window_days" => profile.source_window_days,
          "computed_at" => profile.computed_at&.iso8601,
          "overrides_updated_at" => profile.overrides_updated_at&.iso8601,
          "has_overrides" => overrides.values.any? { |v| v.present? }
        }
        merged
      end

      def profile_text_for_prompt(user:)
        return "" if user.nil?

        profile = effective_profile(user: user)
        lines = []
        lines << "長期プロフィール(直近#{profile.dig('meta', 'source_window_days') || AiUserProfile::WINDOW_DAYS}日):"
        lines << "強み: #{Array(profile['strengths']).first(3).join(' / ')}"
        lines << "課題: #{Array(profile['challenges']).first(3).join(' / ')}"
        lines << "成長過程: #{Array(profile['growth_journey']).first(3).join(' / ')}"
        Array(profile["custom_items"]).first(3).each do |item|
          title = item["title"].to_s.strip
          content = item["content"].to_s.strip
          next if title.blank? || content.blank?

          lines << "#{title}: #{content}"
        end
        text = lines.join("\n").slice(0, PROFILE_MAX_CHARS)
        text
      end

      private

      def build_source_meta(user, window_days)
        from_date = window_days.days.ago.to_date
        from_time = window_days.days.ago.beginning_of_day
        {
          "training_logs_max_updated_at" => user.training_logs.where(practiced_on: from_date..Date.current).maximum(:updated_at)&.iso8601,
          "monthly_logs_max_updated_at" => user.monthly_logs.where(month_start: from_date.beginning_of_month..Date.current.beginning_of_month).maximum(:updated_at)&.iso8601,
          "measurements_max_updated_at" => user.measurement_runs.where("recorded_at >= ?", from_time).maximum(:updated_at)&.iso8601,
          "settings_signature" => Digest::SHA256.hexdigest([
            user.goal_text.to_s,
            user.ai_custom_instructions.to_s,
            Array(user.ai_improvement_tags).join("|")
          ].join("\n"))
        }
      end

      def build_auto_profile_with_ai(user:, profile:, changed_sources:, window_days:)
        input = build_ai_summary_input(
          user: user,
          window_days: window_days,
          previous_computed_at: profile.computed_at
        )
        Ai::UserLongTermProfileSummarizer.summarize!(input: input, user: user)
      rescue => e
        Rails.logger.warn("[AI][UserLongTermProfileManager] llm_profile_fallback #{e.class}: #{e.message}")
        builder = Ai::UserLongTermProfileBuilder.new(user: user, window_days: window_days)
        builder.build(
          changed_sources: changed_sources.presence || %i[training_logs monthly_logs measurements settings],
          previous_auto_profile: profile.auto_profile
        )
      end

      def build_ai_summary_input(user:, window_days:, previous_computed_at:)
        from_date = window_days.days.ago.to_date
        from_time = window_days.days.ago.beginning_of_day

        logs_90d = user.training_logs
                       .where(practiced_on: from_date..Date.current)
                       .includes(:training_menus)
                       .order(:practiced_on)
                       .to_a

        notes_since_last_update = if previous_computed_at.present?
                                    user.training_logs
                                        .where("updated_at > ?", previous_computed_at)
                                        .where(practiced_on: from_date..Date.current)
                                        .where.not(notes: [ nil, "" ])
                                        .order(:practiced_on)
        else
                                    user.training_logs
                                        .where(practiced_on: from_date..Date.current)
                                        .where.not(notes: [ nil, "" ])
                                        .order(:practiced_on)
        end

        monthly_logs = user.monthly_logs
                          .where(month_start: from_date.beginning_of_month..Date.current.beginning_of_month)
                          .order(:month_start)

        menu_counts = TrainingLogMenu
                        .joins(:training_log, :training_menu)
                        .where(training_log_menus: { user_id: user.id })
                        .where(training_logs: { practiced_on: from_date..Date.current })
                        .group("training_menus.name")
                        .order(Arel.sql("COUNT(*) DESC"))
                        .count

        measurement_snapshot = build_measurement_snapshot(user: user, from_time: from_time)

        {
          summary_scope: {
            window_days: window_days,
            previous_computed_at: previous_computed_at&.iso8601,
            current_time: Time.current.iso8601
          },
          notes_since_previous_update: notes_since_last_update.map do |log|
            {
              practiced_on: log.practiced_on&.iso8601,
              note: log.notes.to_s
            }
          end,
          monthly_reflection_notes: monthly_logs.map do |log|
            {
              month_start: log.month_start&.iso8601,
              note: log.notes.to_s
            }
          end,
          menu_execution_counts_90d: menu_counts.map { |name, count| { menu: name.to_s, count: count.to_i } },
          goal_text: user.goal_text.to_s,
          improvement_tags: Array(user.ai_improvement_tags),
          recording_analysis_results: measurement_snapshot,
          all_daily_notes_90d: logs_90d.filter_map do |log|
            next if log.notes.to_s.strip.blank?

            {
              practiced_on: log.practiced_on&.iso8601,
              note: log.notes.to_s
            }
          end
        }
      end

      def build_measurement_snapshot(user:, from_time:)
        runs = user.measurement_runs
                   .where(include_in_insights: true)
                   .where("recorded_at >= ?", from_time)
                   .includes(:range_result, :long_tone_result, :volume_stability_result, :pitch_accuracy_result)
                   .latest_first
                   .limit(40)

        {
          range: runs.select { |r| r.measurement_type == "range" }.first(10).map do |run|
            result = run.range_result
            {
              recorded_at: run.recorded_at&.iso8601,
              lowest_note: result&.lowest_note,
              highest_note: result&.highest_note,
              range_semitones: result&.range_semitones
            }
          end,
          long_tone: runs.select { |r| r.measurement_type == "long_tone" }.first(10).map do |run|
            result = run.long_tone_result
            {
              recorded_at: run.recorded_at&.iso8601,
              sustain_sec: result&.sustain_sec&.to_f,
              sustain_note: result&.sustain_note
            }
          end,
          pitch_accuracy: runs.select { |r| r.measurement_type == "pitch_accuracy" }.first(10).map do |run|
            result = run.pitch_accuracy_result
            {
              recorded_at: run.recorded_at&.iso8601,
              avg_cents_error: result&.avg_cents_error&.to_f,
              accuracy_score: result&.accuracy_score&.to_f,
              note_count: result&.note_count
            }
          end,
          volume_stability: runs.select { |r| r.measurement_type == "volume_stability" }.first(10).map do |run|
            result = run.volume_stability_result
            {
              recorded_at: run.recorded_at&.iso8601,
              avg_loudness_db: result&.avg_loudness_db&.to_f,
              loudness_range_db: result&.loudness_range_db&.to_f,
              loudness_range_pct: result&.loudness_range_pct&.to_f
            }
          end
        }
      end

      def build_fingerprint(user, source_meta, window_days)
        raw = [
          user.id,
          window_days,
          PROFILE_VERSION,
          source_meta["training_logs_max_updated_at"],
          source_meta["monthly_logs_max_updated_at"],
          source_meta["measurements_max_updated_at"],
          source_meta["settings_signature"]
        ].join("|")
        Digest::SHA256.hexdigest(raw)
      end

      def detect_changed_sources(old_meta, new_meta)
        old = old_meta.is_a?(Hash) ? old_meta : {}
        changed = []
        changed << :training_logs if old["training_logs_max_updated_at"] != new_meta["training_logs_max_updated_at"]
        changed << :monthly_logs if old["monthly_logs_max_updated_at"] != new_meta["monthly_logs_max_updated_at"]
        changed << :measurements if old["measurements_max_updated_at"] != new_meta["measurements_max_updated_at"]
        changed << :settings if old["settings_signature"] != new_meta["settings_signature"]
        changed
      end

      def normalize_profile(raw)
        return empty_profile.except("meta") unless raw.is_a?(Hash)

        {
          "strengths" => normalize_string_array(raw["strengths"]),
          "challenges" => normalize_string_array(raw["challenges"]),
          "growth_journey" => normalize_string_array(raw["growth_journey"]),
          "custom_items" => normalize_custom_items(raw["custom_items"])
        }
      end

      def normalize_overrides(raw)
        normalize_profile(raw)
      end

      def normalize_string_array(value)
        Array(value).map(&:to_s).map(&:strip).reject(&:blank?).uniq.first(6)
      end

      def normalize_custom_items(value)
        Array(value).filter_map do |item|
          next unless item.is_a?(Hash)

          title = item["title"].to_s.strip
          content = item["content"].to_s.strip
          next if title.blank? || content.blank?

          { "title" => title.slice(0, 40), "content" => content.slice(0, 220) }
        end.first(6)
      end

      def merge_profile(auto, overrides)
        {
          "strengths" => overrides["strengths"].presence || auto["strengths"],
          "challenges" => overrides["challenges"].presence || auto["challenges"],
          "growth_journey" => overrides["growth_journey"].presence || auto["growth_journey"],
          "custom_items" => overrides["custom_items"].presence || auto["custom_items"]
        }
      end

      def empty_profile
        {
          "strengths" => [],
          "challenges" => [],
          "growth_journey" => [],
          "custom_items" => [],
          "meta" => {
            "profile_version" => PROFILE_VERSION,
            "source_window_days" => AiUserProfile::WINDOW_DAYS,
            "computed_at" => nil,
            "overrides_updated_at" => nil,
            "has_overrides" => false
          }
        }
      end
    end
  end
end
