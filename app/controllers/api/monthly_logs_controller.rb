module Api
  class MonthlyLogsController < ApplicationController
    before_action :require_login!
    NOTE_REGEX = /\A([A-G])([#b]?)(-?\d+)\z/
    NOTE_OFFSETS = {
      "C" => 0,
      "D" => 2,
      "E" => 4,
      "F" => 5,
      "G" => 7,
      "A" => 9,
      "B" => 11
    }.freeze

    # GET /api/monthly_logs?month=YYYY-MM
    def show
      month_start = parse_month_start!(params[:month])
      month_end = month_start.end_of_month
      log = current_user.monthly_logs.find_by(month_start: month_start)
      logs_scope = current_user.training_logs
                              .where(practiced_on: month_start..month_end)
                              .includes(:training_menus, :training_log_menus)
                              .order(practiced_on: :desc)

      render json: {
        data: {
          month: month_start.strftime("%Y-%m"),
          month_start: month_start.iso8601,
          month_end: month_end.iso8601,
          notes: log&.notes,
          summary: build_summary(month_start, month_end, logs_scope),
          daily_logs: logs_scope.map { |training_log| serialize_training_log(training_log) }
        }
      }, status: :ok
    rescue ArgumentError => e
      render json: { error: e.message }, status: :bad_request
    end

    # GET /api/monthly_logs/comparison?month=YYYY-MM
    def comparison
      month_start = parse_month_start!(params[:month])

      render json: {
        data: build_comparison(month_start)
      }, status: :ok
    rescue ArgumentError => e
      render json: { error: e.message }, status: :bad_request
    end

    # POST /api/monthly_logs
    # { month: "YYYY-MM", notes: "..." }
    def create
      month_start = parse_month_start!(create_params[:month])
      log = current_user.monthly_logs.find_or_initialize_by(month_start: month_start)
      was_new_record = log.new_record?
      log.notes = create_params[:notes].to_s.strip.presence

      if log.save
        rewards =
          if was_new_record
            Gamification::Awarder.call(
              user: current_user,
              grants: [ { rule_key: "monthly_log_saved", source_type: "monthly_log", source_id: log.id } ]
            )
          else
            nil
          end
        render json: {
          data: {
            id: log.id,
            month: month_start.strftime("%Y-%m"),
            month_start: month_start.iso8601,
            notes: log.notes,
            updated_at: log.updated_at&.iso8601
          },
          rewards: rewards
        }, status: :ok
      else
        render json: { errors: log.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ArgumentError => e
      render json: { errors: [ e.message ] }, status: :unprocessable_entity
    end

    private

    def create_params
      params.permit(:month, :notes)
    end

    def parse_month_start!(month)
      value = month.to_s.strip
      raise ArgumentError, "month is required. use YYYY-MM" if value.blank?
      raise ArgumentError, "invalid month format. use YYYY-MM" unless /\A\d{4}-\d{2}\z/.match?(value)

      Date.strptime("#{value}-01", "%Y-%m-%d").beginning_of_month
    rescue ArgumentError
      raise ArgumentError, "invalid month format. use YYYY-MM"
    end

    def build_comparison(month_start)
      month_end = month_start.end_of_month
      previous_month_start = (month_start - 1.month).beginning_of_month
      previous_month_end = previous_month_start.end_of_month
      today = Time.zone.today
      is_current_month = month_start.year == today.year && month_start.month == today.month

      current_range_start = month_start
      previous_range_start = previous_month_start
      current_range_end = is_current_month ? [today, month_end].min : month_end
      previous_range_end = previous_month_end
      current_label = "今月(#{current_range_start.day}〜#{current_range_end.day}日)"
      previous_label = "先月(月全体)"

      current = summarize_range(current_range_start, current_range_end)
      previous = summarize_range(previous_range_start, previous_range_end)

      {
        practice_time: build_daily_average_metric(
          current[:practice_time],
          current[:practice_days],
          previous[:practice_time],
          previous[:practice_days]
        ),
        measurement_changes: build_measurement_changes(
          current_range_start: current_range_start,
          current_range_end: current_range_end,
          previous_range_start: previous_range_start,
          previous_range_end: previous_range_end
        ),
        meta: {
          current_range_label: current_label,
          previous_range_label: previous_label,
          basis_label: "練習時間合計 ÷ 練習した日数"
        }
      }
    end

    def summarize_range(range_start, range_end)
      logs_scope = current_user.training_logs.where(practiced_on: range_start..range_end)
      {
        practice_time: logs_scope.sum("COALESCE(duration_min, 0)").to_i,
        practice_days: logs_scope.count.to_i
      }
    end

    def build_measurement_changes(current_range_start:, current_range_end:, previous_range_start:, previous_range_end:)
      definitions = [
        {
          key: "falsetto_top_note",
          label: "裏声最高音",
          unit: "半音",
          better: :higher,
          epsilon: 1.0
        },
        {
          key: "chest_top_note",
          label: "地声最高音",
          unit: "半音",
          better: :higher,
          epsilon: 1.0
        },
        {
          key: "long_tone_sustain_sec",
          label: "ロングトーン秒数",
          unit: "s",
          better: :higher,
          epsilon: 2.0
        },
        {
          key: "pitch_error_semitones",
          label: "音程正確性（半音ずれ）",
          unit: "半音",
          better: :lower,
          epsilon: 0.1
        },
        {
          key: "volume_stability_pct",
          label: "音量安定性",
          unit: "%",
          better: :higher,
          epsilon: 2.0
        }
      ]

      definitions.filter_map do |definition|
        item = build_measurement_change_item(
          key: definition[:key],
          label: definition[:label],
          unit: definition[:unit],
          better: definition[:better],
          epsilon: definition[:epsilon],
          current_range_start: current_range_start,
          current_range_end: current_range_end,
          previous_range_start: previous_range_start,
          previous_range_end: previous_range_end
        )
        next nil if item.nil?

        item
      end
    end

    def build_measurement_change_item(key:, label:, unit:, better:, epsilon:, current_range_start:, current_range_end:, previous_range_start:, previous_range_end:)
      current_best = measurement_average_in_range(key, current_range_start, current_range_end)
      previous_best = measurement_average_in_range(key, previous_range_start, previous_range_end)
      current_count = measurement_count_in_range(key, current_range_start, current_range_end)
      previous_count = measurement_count_in_range(key, previous_range_start, previous_range_end)

      # データが全くない項目は表示候補から外す
      return nil if current_count.zero? && previous_count.zero?

      current_value = current_best&.dig(:value)
      previous_value = previous_best&.dig(:value)
      diff =
        if current_value.nil? || previous_value.nil?
          nil
        else
          (current_value.to_f - previous_value.to_f).round(2)
        end

      status = classify_measurement_change(diff, epsilon, better)
      low_sample = current_count <= 1 || previous_count <= 1

      {
        key: key,
        label: label,
        unit: unit,
        better: better.to_s,
        epsilon: epsilon,
        status: status,
        current: {
          value: current_value&.round(2),
          display: current_value.nil? ? "—" : measurement_display_text_from_value(key, current_value),
          count: current_count
        },
        previous: {
          value: previous_value&.round(2),
          display: previous_value.nil? ? "—" : measurement_display_text_from_value(key, previous_value),
          count: previous_count
        },
        diff: diff,
        diff_display: measurement_diff_text(key, diff),
        low_sample: low_sample
      }
    end

    def measurement_average_in_range(key, range_start, range_end)
      values = measurement_values_in_range(key, range_start, range_end)
      return nil if values.empty?

      avg_value = values.sum { |item| item[:value].to_f } / values.size.to_f
      {
        value: avg_value,
        display: measurement_display_text_from_value(key, avg_value)
      }
    end

    def measurement_count_in_range(key, range_start, range_end)
      measurement_values_in_range(key, range_start, range_end).size
    end

    def measurement_values_in_range(key, range_start, range_end)
      range = range_start.beginning_of_day..range_end.end_of_day
      case key
      when "falsetto_top_note"
        current_user.measurement_runs
                    .where(measurement_type: "range", include_in_insights: true, recorded_at: range)
                    .includes(:range_result)
                    .filter_map do |run|
          note = run.range_result&.falsetto_top_note
          midi = note_to_midi(note)
          next nil if note.blank? || midi.nil?

          { value: midi.to_f, display: note.to_s }
        end
      when "chest_top_note"
        current_user.measurement_runs
                    .where(measurement_type: "range", include_in_insights: true, recorded_at: range)
                    .includes(:range_result)
                    .filter_map do |run|
          note = run.range_result&.chest_top_note
          midi = note_to_midi(note)
          next nil if note.blank? || midi.nil?

          { value: midi.to_f, display: note.to_s }
        end
      when "long_tone_sustain_sec"
        current_user.measurement_runs
                    .where(measurement_type: "long_tone", include_in_insights: true, recorded_at: range)
                    .includes(:long_tone_result)
                    .filter_map do |run|
          sustain_sec = run.long_tone_result&.sustain_sec
          next nil if sustain_sec.nil?

          { value: sustain_sec.to_f, display: format("%.1fs", sustain_sec.to_f) }
        end
      when "pitch_error_semitones"
        current_user.measurement_runs
                    .where(measurement_type: "pitch_accuracy", include_in_insights: true, recorded_at: range)
                    .includes(:pitch_accuracy_result)
                    .filter_map do |run|
          cents = run.pitch_accuracy_result&.avg_cents_error
          next nil if cents.nil?

          semitones = cents.to_f.abs / 100.0
          { value: semitones, display: "#{format("%.1f", semitones)}半音" }
        end
      when "volume_stability_pct"
        current_user.measurement_runs
                    .where(measurement_type: "volume_stability", include_in_insights: true, recorded_at: range)
                    .includes(:volume_stability_result)
                    .filter_map do |run|
          pct = run.volume_stability_result&.loudness_range_pct
          next nil if pct.nil?

          v = pct.to_f.clamp(0.0, 100.0)
          { value: v, display: "#{format("%.1f", v)}%" }
        end
      else
        []
      end
    end

    def measurement_display_text_from_value(key, value)
      case key
      when "falsetto_top_note", "chest_top_note"
        midi_to_note(value)
      when "long_tone_sustain_sec"
        "#{format("%.1f", value.to_f)}s"
      when "pitch_error_semitones"
        "#{format("%.2f", value.to_f)}半音"
      when "volume_stability_pct"
        "#{format("%.1f", value.to_f)}%"
      else
        "—"
      end
    end

    def measurement_diff_text(key, diff)
      return "—" if diff.nil?

      case key
      when "falsetto_top_note", "chest_top_note"
        prefix = diff.positive? ? "+" : ""
        "#{prefix}#{diff.round.to_i}半音"
      when "long_tone_sustain_sec"
        prefix = diff.positive? ? "+" : ""
        "#{prefix}#{format("%.1f", diff.to_f)}s"
      when "pitch_error_semitones"
        prefix = diff.positive? ? "+" : ""
        "#{prefix}#{format("%.2f", diff.to_f)}半音"
      when "volume_stability_pct"
        prefix = diff.positive? ? "+" : ""
        "#{prefix}#{format("%.1f", diff.to_f)}%"
      else
        "—"
      end
    end

    def classify_measurement_change(diff, epsilon, better)
      return "no_data" if diff.nil?

      if better == :lower
        return "improved" if diff.negative?
        return "stable" if diff < epsilon

        "declined"
      else
        return "improved" if diff.positive?
        return "stable" if diff > -epsilon

        "declined"
      end
    end

    def note_to_midi(note)
      m = note.to_s.strip.match(NOTE_REGEX)
      return nil unless m

      name = m[1]
      accidental = m[2]
      octave = m[3].to_i
      base = NOTE_OFFSETS[name]
      return nil if base.nil?

      delta = accidental == "#" ? 1 : accidental == "b" ? -1 : 0
      (octave + 1) * 12 + base + delta
    end

    def midi_to_note(midi_value)
      midi = midi_value.to_i
      return "—" if midi < 0

      names = %w[C C# D D# E F F# G G# A A# B]
      note = names[midi % 12]
      octave = (midi / 12) - 1
      "#{note}#{octave}"
    end

    def build_daily_average_metric(current_minutes, current_days, previous_minutes, previous_days)
      current_value =
        if current_days.to_i.positive?
          (current_minutes.to_f / current_days.to_f).round(1)
        end
      previous_value =
        if previous_days.to_i.positive?
          (previous_minutes.to_f / previous_days.to_f).round(1)
        end
      diff =
        if current_value.nil? || previous_value.nil?
          nil
        else
          (current_value - previous_value).round(1)
        end
      pct =
        if current_value.nil? || previous_value.nil? || previous_value.zero?
          nil
        else
          ((diff.to_f / previous_value.to_f) * 100.0).round(1)
        end

      {
        current: current_value,
        previous: previous_value,
        diff: diff,
        pct: pct,
        current_days: current_days.to_i,
        previous_days: previous_days.to_i
      }
    end

    def build_summary(month_start, month_end, logs_scope)
      total_duration_min = logs_scope.sum("COALESCE(duration_min, 0)").to_i
      total_menu_count =
        TrainingLogMenu
          .joins(:training_log)
          .where(training_log_menus: { user_id: current_user.id })
          .where(training_logs: { practiced_on: month_start..month_end })
          .count
      menu_counts =
        TrainingLogMenu
          .joins(:training_log, :training_menu)
          .where(training_log_menus: { user_id: current_user.id })
          .where(training_logs: { practiced_on: month_start..month_end })
          .group("training_log_menus.training_menu_id", "training_menus.name", "training_menus.color")
          .select(
            "training_log_menus.training_menu_id AS menu_id",
            "training_menus.name AS name",
            "training_menus.color AS color",
            "COUNT(*) AS count"
          )
          .order(Arel.sql("COUNT(*) DESC"), "training_menus.name ASC")
          .map do |row|
            {
              menu_id: row.menu_id.to_i,
              name: row.name.to_s,
              color: row.color,
              count: row.count.to_i
            }
          end

      {
        total_duration_min: total_duration_min,
        total_menu_count: total_menu_count,
        menu_counts: menu_counts
      }
    end

    def serialize_training_log(log)
      menus_by_id = log.training_menus.index_by(&:id)
      ordered_menu_ids = log.training_log_menus.map(&:training_menu_id)
      ordered_menus = ordered_menu_ids.filter_map do |menu_id|
        menu = menus_by_id[menu_id]
        next if menu.nil?

        {
          id: menu.id,
          name: menu.name,
          color: menu.color,
          archived: menu.archived
        }
      end

      {
        id: log.id,
        practiced_on: log.practiced_on.iso8601,
        duration_min: log.duration_min,
        menus: ordered_menus,
        notes: log.notes,
        updated_at: log.updated_at&.iso8601
      }
    end
  end
end
