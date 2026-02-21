# app/controllers/api/insights_controller.rb
module Api
  class InsightsController < ApplicationController
    before_action :require_login!

    def show
      days = params[:days].presence&.to_i || 30
      days = 30 if days <= 0
      days = 365 if days > 365

      to = Date.current
      from = to - (days - 1)

      base_scope = current_user.training_logs.where(practiced_on: from..to)

      # count は select をかける前の scope で数える（重要）
      practice_days_count = base_scope.count

      logs = base_scope
             .select(:id, :practiced_on, :duration_min)
             .order(:practiced_on)

      # --- daily durations (missing days => 0) ---
      duration_by_date = {}
      logs.each do |l|
        duration_by_date[l.practiced_on] = (l.duration_min || 0)
      end

      daily_durations = (0...days).map do |i|
        d = from + i
        { date: d.iso8601, duration_min: duration_by_date[d] || 0 }
      end

      all_time_scope = current_user.training_logs
      total_practice_days_count = all_time_scope.count
      measurement_data = build_measurement_data(from: from, to: to, days: days)
      gamification_summary = Gamification::Progress.summary_for(current_user)
      streaks = {
        current_days: gamification_summary[:streak_current_days],
        longest_days: gamification_summary[:streak_longest_days]
      }

      render json: {
        data: {
          range: { from: from.iso8601, to: to.iso8601, days: days },
          daily_durations: daily_durations,
          practice_days_count: practice_days_count,
          total_practice_days_count: total_practice_days_count,
          note_series: {
            falsetto: measurement_data[:note_series][:falsetto],
            chest: measurement_data[:note_series][:chest]
          },
          measurement_series: measurement_data[:measurement_series],
          streaks: streaks,
          top_notes: {
            falsetto: measurement_data[:top_notes][:falsetto],
            chest: measurement_data[:top_notes][:chest]
          },
          gamification: gamification_summary
        }
      }, status: :ok
    end

    private

    def build_measurement_data(from:, to:, days:)
      kinds = %w[range long_tone volume_stability]
      value_by_kind_and_date = {}
      kinds.each { |kind| value_by_kind_and_date[kind] = {} }
      top_notes = {
        falsetto: { note: nil, midi: nil, date: nil },
        chest: { note: nil, midi: nil, date: nil }
      }

      runs = current_user.measurement_runs
                        .where(measurement_type: kinds, recorded_at: from.beginning_of_day..to.end_of_day)
                        .includes(:range_result, :long_tone_result, :volume_stability_result)
                        .order(:recorded_at)
      runs.each do |run|
        kind = run.measurement_type.to_s
        next unless kinds.include?(kind)

        date = run.recorded_at.in_time_zone.to_date
        next if date < from || date > to

        value = measurement_value_for(run, kind)
        next if value.nil?

        value_by_kind_and_date[kind][date] = value
      end

      measurement_series = kinds.to_h do |kind|
        points = (0...days).map do |i|
          d = from + i
          {
            date: d.iso8601,
            value: value_by_kind_and_date[kind][d]
          }
        end
        [ kind, points ]
      end

      note_series = {
        falsetto: (0...days).map { |i| d = from + i; { date: d.iso8601, midi: nil } },
        chest: (0...days).map { |i| d = from + i; { date: d.iso8601, midi: nil } }
      }

      {
        measurement_series: measurement_series,
        note_series: note_series,
        top_notes: top_notes
      }
    end

    def measurement_value_for(run, kind)
      case kind
      when "range"
        run.range_result&.range_semitones
      when "long_tone"
        run.long_tone_result&.sustain_sec&.to_f
      when "volume_stability"
        run.volume_stability_result&.loudness_range_pct&.to_f
      else
        nil
      end
    end
  end
end
