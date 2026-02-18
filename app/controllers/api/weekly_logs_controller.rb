module Api
  class WeeklyLogsController < ApplicationController
    before_action :require_login!

    # GET /api/weekly_logs?week_start=YYYY-MM-DD
    def show
      week_start = parse_week_start!(params[:week_start])
      log = current_user.weekly_logs.find_by(week_start: week_start)

      render json: {
        data: log ? serialize(log) : nil,
        summary: build_summary(week_start)
      }, status: :ok
    rescue ArgumentError => e
      render json: { error: e.message }, status: :bad_request
    end

    # POST /api/weekly_logs (upsert)
    # {
    #   week_start: "YYYY-MM-DD",
    #   notes: "...",
    #   effect_feedbacks: [{ menu_id: 1, improvement_tags: ["pitch_stability"] }]
    # }
    def create
      week_start = parse_week_start!(create_params[:week_start])

      log = current_user.weekly_logs.find_or_initialize_by(week_start: week_start)
      log.notes = create_params[:notes].presence

      effect_feedbacks = normalize_effect_feedbacks(create_params[:effect_feedbacks])
      effect_menu_ids = effect_feedbacks.map { |e| e[:menu_id] }.uniq
      valid_effect_menu_ids = current_user.training_menus.where(id: effect_menu_ids).pluck(:id)
      if (effect_menu_ids - valid_effect_menu_ids).any?
        return render json: { errors: [ "effect_feedbacks contains invalid menu_id" ] }, status: :unprocessable_entity
      end

      invalid_tags = effect_feedbacks.flat_map { |e| e[:improvement_tags] }.uniq - TrainingLogFeedback::IMPROVEMENT_TAGS
      if invalid_tags.any?
        return render json: { errors: [ "effect_feedbacks contains invalid tag(s)" ] }, status: :unprocessable_entity
      end

      log.effect_feedbacks = effect_feedbacks.map do |entry|
        {
          "menu_id" => entry[:menu_id],
          "improvement_tags" => entry[:improvement_tags]
        }
      end

      if log.save
        render json: {
          data: serialize(log),
          summary: build_summary(week_start)
        }, status: :ok
      else
        render json: { errors: log.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ArgumentError => e
      render json: { errors: [ e.message ] }, status: :unprocessable_entity
    end

    private

    def create_params
      params.permit(
        :week_start,
        :notes,
        effect_feedbacks: [ :menu_id, { improvement_tags: [] } ]
      )
    end

    def parse_week_start!(value)
      raise ArgumentError, "week_start is required" if value.blank?

      Date.iso8601(value.to_s).beginning_of_week(:monday)
    rescue ArgumentError
      raise ArgumentError, "invalid week_start format. use YYYY-MM-DD"
    end

    def normalize_effect_feedbacks(raw)
      Array(raw).filter_map do |entry|
        next unless entry.is_a?(ActionController::Parameters) || entry.is_a?(Hash)

        menu_id = Integer(entry[:menu_id] || entry["menu_id"], exception: false)
        next unless menu_id&.positive?

        improvement_tags = Array(entry[:improvement_tags] || entry["improvement_tags"]).map(&:to_s).map(&:strip).reject(&:blank?).uniq
        next if improvement_tags.empty?

        { menu_id: menu_id, improvement_tags: improvement_tags }
      end
    end

    def build_summary(week_start)
      week_end = week_start + 6
      base_scope = current_user.training_logs.where(practiced_on: week_start..week_end)

      total_duration_min = base_scope.sum("COALESCE(duration_min, 0)").to_i
      practice_days_count = base_scope.count
      logs = base_scope.select(:practiced_on, :falsetto_top_note, :chest_top_note).order(:practiced_on)
      top_falsetto = best_note(logs, :falsetto_top_note)
      top_chest = best_note(logs, :chest_top_note)

      menu_counts =
        TrainingLogMenu
          .joins(:training_log)
          .joins(:training_menu)
          .where(training_log_menus: { user_id: current_user.id })
          .where(training_logs: { practiced_on: week_start..week_end })
          .group("training_log_menus.training_menu_id", "training_menus.name", "training_menus.color")
          .select(
            "training_log_menus.training_menu_id AS menu_id",
            "training_menus.name AS name",
            "training_menus.color AS color",
            "COUNT(*) AS count"
          )
          .order(Arel.sql("COUNT(*) DESC"))
          .map do |row|
            {
              menu_id: row.menu_id.to_i,
              name: row.name.to_s,
              color: row.color.to_s,
              count: row.count.to_i
            }
          end

      {
        week_start: week_start.iso8601,
        week_end: week_end.iso8601,
        total_duration_min: total_duration_min,
        practice_days_count: practice_days_count,
        falsetto_top_note: top_falsetto,
        chest_top_note: top_chest,
        menu_counts: menu_counts
      }
    end

    def serialize(log)
      {
        id: log.id,
        week_start: log.week_start.iso8601,
        week_end: (log.week_start + 6).iso8601,
        notes: log.notes,
        effect_feedbacks: serialize_effect_feedbacks(log.effect_feedbacks),
        updated_at: log.updated_at&.iso8601
      }
    end

    def serialize_effect_feedbacks(raw)
      Array(raw).filter_map do |entry|
        menu_id = Integer(entry["menu_id"] || entry[:menu_id], exception: false)
        next unless menu_id&.positive?

        tags = Array(entry["improvement_tags"] || entry[:improvement_tags]).map(&:to_s).map(&:strip).reject(&:blank?).uniq
        next if tags.empty?

        { menu_id: menu_id, improvement_tags: tags }
      end
    end

    def best_note(logs, attr)
      best_note = nil
      best_midi = nil

      logs.each do |log|
        note = log.public_send(attr).to_s.strip
        next if note.blank?

        midi = note_to_midi(note)
        next if midi.nil?

        if best_midi.nil? || midi > best_midi
          best_midi = midi
          best_note = note
        end
      end

      best_note
    end

    def note_to_midi(note)
      m = note.to_s.strip.match(/\A([A-Ga-g])([#b]?)(-?\d)\z/)
      return nil if m.nil?

      letter = m[1].upcase
      accidental = m[2]
      octave = m[3].to_i

      semitone = {
        "C" => 0, "D" => 2, "E" => 4, "F" => 5,
        "G" => 7, "A" => 9, "B" => 11
      }[letter]
      return nil if semitone.nil?

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
