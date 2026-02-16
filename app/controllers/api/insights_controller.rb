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
             .select(:id, :practiced_on, :duration_min, :falsetto_top_note, :chest_top_note)
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

      # --- menu ranking (menu_id based) ---
      ranking_rows =
        TrainingLogMenu
          .joins(:training_log)
          .joins(:training_menu)
          .where(training_log_menus: { user_id: current_user.id })
          .where(training_logs: { practiced_on: from..to })
          .group("training_log_menus.training_menu_id", "training_menus.name", "training_menus.color")
          .select(
            "training_log_menus.training_menu_id AS menu_id",
            "training_menus.name AS name",
            "training_menus.color AS color",
            "COUNT(*) AS count"
          )
          .order(Arel.sql("COUNT(*) DESC"))

      menu_ranking = ranking_rows.map do |r|
        { menu_id: r.menu_id.to_i, name: r.name.to_s, color: r.color.to_s, count: r.count.to_i }
      end

      # --- top notes (ALL TIME) + achieved date ---
      all_time_logs = current_user.training_logs
                                  .select(:practiced_on, :falsetto_top_note, :chest_top_note)
                                  .order(:practiced_on)

      top_fal = best_note_with_date(all_time_logs, :falsetto_top_note)
      top_ch  = best_note_with_date(all_time_logs, :chest_top_note)

      render json: {
        data: {
          range: { from: from.iso8601, to: to.iso8601, days: days },
          daily_durations: daily_durations,
          practice_days_count: practice_days_count,
          menu_ranking: menu_ranking,
          top_notes: { falsetto: top_fal, chest: top_ch }
        }
      }, status: :ok
    end

    private

    # 最大音 + 達成日（同点の場合は最新日を採用）
    # 戻り: { note: "A4", midi: 69, date: "2026-02-10" } or { note: nil, midi: nil, date: nil }
    def best_note_with_date(logs, note_attr)
      best_note = nil
      best_midi = nil
      best_date = nil

      logs.each do |log|
        n = log.public_send(note_attr)
        next if n.nil?

        midi = note_to_midi(n)
        next if midi.nil?

        d = log.practiced_on
        next if d.nil?

        if best_midi.nil? || midi > best_midi || (midi == best_midi && d > best_date)
          best_midi = midi
          best_note = n.to_s.strip
          best_date = d
        end
      end

      {
        note: best_note,
        midi: best_midi,
        date: best_date&.iso8601
      }
    end

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
  end
end
