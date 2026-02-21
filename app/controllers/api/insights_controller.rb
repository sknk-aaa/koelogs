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

    def note_to_midi(note)
      s = note.to_s.strip
      return nil if s.empty?

      m = s.match(/\A([A-Ga-g])([#b]?)(-?\d)\z/)
      return nil if m.nil?

      letter = m[1].upcase
      accidental = m[2]
      octave = m[3].to_i

      semitone_base = {
        "C" => 0, "D" => 2, "E" => 4, "F" => 5,
        "G" => 7, "A" => 9, "B" => 11
      }[letter]
      return nil if semitone_base.nil?

      semitone = semitone_base
      semitone += 1 if accidental == "#"
      semitone -= 1 if accidental == "b"

      if semitone >= 12
        semitone -= 12
        octave += 1
      elsif semitone < 0
        semitone += 12
        octave -= 1
      end

      (octave + 1) * 12 + semitone
    rescue
      nil
    end

    def build_measurement_data(from:, to:, days:)
      kinds = %w[falsetto_peak chest_peak range long_tone pitch_accuracy volume_stability]
      value_by_kind_and_date = {}
      kinds.each { |kind| value_by_kind_and_date[kind] = {} }
      top_notes = {
        falsetto: { note: nil, midi: nil, date: nil },
        chest: { note: nil, midi: nil, date: nil }
      }

      sessions = current_user.analysis_sessions.where(created_at: from.beginning_of_day..to.end_of_day).order(:created_at)
      sessions.each do |session|
        kind = session.measurement_kind.to_s
        next unless kinds.include?(kind)

        date = session.created_at.in_time_zone.to_date
        next if date < from || date > to

        value = measurement_value_for(session, kind)
        next if value.nil?

        value_by_kind_and_date[kind][date] = value
      end

      note_sessions = current_user.analysis_sessions.where(measurement_kind: %w[falsetto_peak chest_peak]).order(:created_at)
      falsetto_daily_midi = {}
      chest_daily_midi = {}
      note_sessions.each do |session|
        midi = note_to_midi(session.peak_note)
        next if midi.nil?

        date = session.created_at.in_time_zone.to_date
        kind = session.measurement_kind.to_s
        note = session.peak_note.to_s.strip

        if kind == "falsetto_peak"
          falsetto_daily_midi[date] = midi
          update_top_note!(top_notes[:falsetto], note: note, midi: midi, date: date)
        elsif kind == "chest_peak"
          chest_daily_midi[date] = midi
          update_top_note!(top_notes[:chest], note: note, midi: midi, date: date)
        end
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
        falsetto: (0...days).map { |i| d = from + i; { date: d.iso8601, midi: falsetto_daily_midi[d] } },
        chest: (0...days).map { |i| d = from + i; { date: d.iso8601, midi: chest_daily_midi[d] } }
      }

      {
        measurement_series: measurement_series,
        note_series: note_series,
        top_notes: top_notes
      }
    end

    def update_top_note!(current, note:, midi:, date:)
      current_midi = current[:midi]
      current_date = begin
        Date.iso8601(current[:date].to_s)
      rescue ArgumentError
        nil
      end
      return if current_midi.present? && (midi < current_midi || (midi == current_midi && current_date.present? && date <= current_date))

      current[:note] = note
      current[:midi] = midi
      current[:date] = date.iso8601
    end

    def measurement_value_for(session, kind)
      raw = session.raw_metrics.is_a?(Hash) ? session.raw_metrics : {}
      case kind
      when "falsetto_peak", "chest_peak"
        note_to_midi(session.peak_note)
      when "range"
        session.range_semitones
      when "long_tone"
        raw["phonation_duration_sec"] || session.duration_sec
      when "pitch_accuracy"
        raw["pitch_accuracy_score"]
      when "volume_stability"
        raw["volume_stability_score"]
      else
        nil
      end
    end
  end
end
