# frozen_string_literal: true

require "digest"

module Ai
  class UserLongTermProfileManager
    PROFILE_VERSION = "v1"
    PROFILE_MAX_CHARS = 1000
    TITLE_AVOID = "避けたい練習/注意点"
    CHALLENGE_SCORE_FIELD = "challenge_scores"
    CHALLENGE_SCORE_UP = 2.0
    CHALLENGE_SCORE_DOWN = 0.5
    CHALLENGE_SCORE_DISPLAY_MIN = 3.0
    CHALLENGE_SCORE_WATCH_MIN = 1.5
    CHALLENGE_RULES = [
      {
        key: "throat_tension",
        label: "喉まわりの力み",
        patterns: [ /喉.*(締|絞|詰)/, /のど.*(締|絞|詰)/, /力み/, /喉締め/ ]
      },
      {
        key: "high_note_stagnation",
        label: "高音の伸び停滞",
        patterns: [ /(高音|裏声|最高音).*(伸びない|伸びなく|出ない|停滞)/, /(伸びない|伸びなく).*(高音|裏声|最高音)/ ]
      },
      {
        key: "pitch_instability",
        label: "音程のばらつき",
        patterns: [ /音程.*(外|ずれ|ブレ|不安定)/, /(外しやす|外れる).*(音程)?/ ]
      }
    ].freeze
    CHALLENGE_LABEL_BY_KEY = CHALLENGE_RULES.to_h { |rule| [ rule[:key], rule[:label] ] }.freeze
    MEMORY_RECENCY_WEIGHTS = [ 1.0, 0.95, 0.9, 0.8 ].freeze

    class << self
      def refresh!(user:, force: false, window_days: AiUserProfile::WINDOW_DAYS)
        profile = user.ai_user_profile || user.build_ai_user_profile(source_window_days: window_days)
        source_meta = build_source_meta(user, window_days)
        fingerprint = build_fingerprint(user, source_meta, window_days)
        changed_sources = detect_changed_sources(profile.source_meta, source_meta)

        if !force && changed_sources.empty? && profile.source_fingerprint == fingerprint && profile.computed_at.present?
          return profile
        end

        auto_profile = build_auto_profile_incremental(
          user: user,
          profile: profile,
          changed_sources: changed_sources,
          force: force,
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
        append_weighted_section!(lines, "強み", Array(profile["strengths"]).first(3))
        append_weighted_section!(lines, "課題", Array(profile["challenges"]).first(3))
        append_weighted_section!(lines, "成長過程", Array(profile["growth_journey"]).first(3))
        lines << "メモ項目:"
        Array(profile["custom_items"]).first(6).each_with_index do |item, idx|
          title = item["title"].to_s.strip
          content = item["content"].to_s.strip
          next if title.blank? || content.blank?

          weight = title == TITLE_AVOID ? 1.0 : recency_weight(idx)
          lines << "- [w=#{format('%.2f', weight)}] #{title}: #{content}"
        end
        text = lines.join("\n").slice(0, PROFILE_MAX_CHARS)
        text
      end

      private

      def append_weighted_section!(lines, label, items)
        rows = Array(items).map(&:to_s).map(&:strip).reject(&:blank?)
        lines << "#{label}:"
        if rows.empty?
          lines << "- (なし)"
          return
        end

        rows.each_with_index do |row, idx|
          lines << "- [w=#{format('%.2f', recency_weight(idx))}] #{row}"
        end
      end

      def recency_weight(index)
        MEMORY_RECENCY_WEIGHTS[index] || MEMORY_RECENCY_WEIGHTS.last
      end

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
            Array(user.ai_improvement_tags).join("|"),
            Ai::ResponseStylePreferences.normalize(user.ai_response_style_prefs).to_json
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

      def build_auto_profile_incremental(user:, profile:, changed_sources:, force:, window_days:)
        base_profile = normalize_profile(profile.auto_profile)
        existing_scores = extract_challenge_scores(profile.auto_profile)
        note_entries = collect_incremental_note_entries(
          user: user,
          previous_computed_at: profile.computed_at,
          changed_sources: changed_sources,
          window_days: window_days
        )

        scores = existing_scores
        if note_entries.any?
          scores = apply_challenge_score_updates(existing_scores, note_entries)
        elsif scores.empty? && base_profile["challenges"].present?
          scores = bootstrap_scores_from_challenges(base_profile["challenges"])
        end

        if force && scores.empty?
          full_profile = build_auto_profile_with_ai(
            user: user,
            profile: profile,
            changed_sources: changed_sources,
            window_days: window_days
          )
          base_profile = normalize_profile(full_profile)
          scores = bootstrap_scores_from_challenges(base_profile["challenges"])
        end

        base_profile.merge(
          "challenges" => build_challenge_lines(scores),
          CHALLENGE_SCORE_FIELD => serialize_challenge_scores(scores)
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

      def collect_incremental_note_entries(user:, previous_computed_at:, changed_sources:, window_days:)
        return [] if !changed_sources.include?(:training_logs) && !changed_sources.include?(:monthly_logs)

        from_date = window_days.days.ago.to_date
        entries = []

        logs_scope = user.training_logs.where(practiced_on: from_date..Date.current)
        logs_scope = logs_scope.where("updated_at > ?", previous_computed_at) if previous_computed_at.present?
        logs_scope.order(:updated_at).find_each(batch_size: 100) do |log|
          text = log.notes.to_s.strip
          next if text.blank?

          entries << text
        end

        monthly_scope = user.monthly_logs.where(month_start: from_date.beginning_of_month..Date.current.beginning_of_month)
        monthly_scope = monthly_scope.where("updated_at > ?", previous_computed_at) if previous_computed_at.present?
        monthly_scope.order(:updated_at).find_each(batch_size: 100) do |log|
          text = log.notes.to_s.strip
          next if text.blank?

          entries << text
        end

        entries.first(40)
      end

      def extract_challenge_scores(raw_profile)
        return {} unless raw_profile.is_a?(Hash)
        raw_scores = raw_profile[CHALLENGE_SCORE_FIELD]
        return {} unless raw_scores.is_a?(Hash)

        CHALLENGE_LABEL_BY_KEY.keys.each_with_object({}) do |key, acc|
          value = raw_scores[key] || raw_scores[key.to_sym]
          next unless value.present?

          score = value.to_f
          next unless score.positive?

          acc[key] = score
        end
      end

      def bootstrap_scores_from_challenges(challenges)
        Array(challenges).each_with_object({}) do |line, acc|
          detected_keys(line.to_s).each do |key|
            acc[key] = [ acc[key].to_f, CHALLENGE_SCORE_DISPLAY_MIN ].max
          end
        end
      end

      def apply_challenge_score_updates(existing_scores, note_entries)
        scores = existing_scores.transform_values { |v| [ v.to_f, 0.0 ].max }
        note_entries.each do |entry|
          matched_keys = detected_keys(entry)
          scores.keys.each do |key|
            if matched_keys.include?(key)
              scores[key] = [ scores[key].to_f + CHALLENGE_SCORE_UP, 99.0 ].min
            else
              scores[key] = [ scores[key].to_f - CHALLENGE_SCORE_DOWN, 0.0 ].max
            end
          end

          (matched_keys - scores.keys).each do |new_key|
            scores[new_key] = CHALLENGE_SCORE_UP
          end
        end
        scores.select { |_k, v| v >= CHALLENGE_SCORE_WATCH_MIN }
      end

      def build_challenge_lines(scores)
        scores
          .select { |key, score| CHALLENGE_LABEL_BY_KEY.key?(key) && score.to_f >= CHALLENGE_SCORE_DISPLAY_MIN }
          .sort_by { |key, score| [ -score.to_f, key ] }
          .map { |key, _score| CHALLENGE_LABEL_BY_KEY[key] }
          .uniq
          .first(6)
      end

      def serialize_challenge_scores(scores)
        scores.each_with_object({}) do |(key, value), acc|
          next unless CHALLENGE_LABEL_BY_KEY.key?(key)

          score = value.to_f.round(2)
          next unless score >= CHALLENGE_SCORE_WATCH_MIN

          acc[key] = score
        end
      end

      def detected_keys(text)
        normalized = text.to_s
        return [] if normalized.blank?

        CHALLENGE_RULES.each_with_object([]) do |rule, keys|
          matched = Array(rule[:patterns]).any? { |pattern| normalized.match?(pattern) }
          keys << rule[:key] if matched
        end
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
