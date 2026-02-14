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

      # count は select をかける前の scope で数える（ここが重要）
      practice_days_count = base_scope.count

      logs = base_scope
               .select(:practiced_on, :duration_min, :menus, :falsetto_top_note, :chest_top_note)
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

      # --- menu ranking ---
      menu_counts = Hash.new(0)
      logs.each do |l|
        vals = l.menus
        vals = [] if vals.nil?
        vals = vals.is_a?(String) ? parse_maybe_json_array(vals) : Array(vals)

        vals.each do |m|
          s = m.to_s.strip
          next if s.empty?
          menu_counts[s] += 1
        end
      end

      menu_ranking = menu_counts
                     .sort_by { |(_k, v)| -v }
                     .map { |k, v| { menu: k, count: v } }

      # --- top notes (ALL TIME) ---
      top_fal = best_note(current_user.training_logs.where.not(falsetto_top_note: nil).pluck(:falsetto_top_note))
      top_ch = best_note(current_user.training_logs.where.not(chest_top_note: nil).pluck(:chest_top_note))

      render json: {
        data: {
          range: { from: from.iso8601, to: to.iso8601, days: days },
          daily_durations: daily_durations,
          practice_days_count: practice_days_count,
          menu_ranking: menu_ranking,
          top_notes: {
            falsetto: top_fal,
            chest: top_ch
          }
        }
      }, status: :ok
    end

    private

    def parse_maybe_json_array(str)
      s = str.to_s.strip
      return [] if s.empty?

      begin
        v = JSON.parse(s)
        v.is_a?(Array) ? v : []
      rescue
        []
      end
    end

    def best_note(notes)
      best = nil
      best_midi = nil

      notes.compact.each do |n|
        midi = note_to_midi(n)
        next if midi.nil?
        if best_midi.nil? || midi > best_midi
          best_midi = midi
          best = n.to_s.strip
        end
      end

      { note: best, midi: best_midi }
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
        "C" => 0, "D" => 2, "E" => 4, "F" => 5, "G" => 7, "A" => 9, "B" => 11
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
