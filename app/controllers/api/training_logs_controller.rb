# app/controllers/api/training_logs_controller.rb
module Api
  class TrainingLogsController < ApplicationController
    before_action :require_login!

    # GET /api/training_logs?date=YYYY-MM-DD
    # GET /api/training_logs?month=YYYY-MM
    def index
      if params[:date].present?
        return render_day
      end
      if params[:month].present?
        return render_month
      end
      render json: { error: "date or month is required" }, status: :bad_request
    end

    # POST /api/training_logs (upsert)
    #
    # body example:
    # {
    #   "practiced_on": "2026-02-13",
    #   "duration_min": 30,
    #   "menu_ids": [1,2,3],
    #   "notes": "memo...",
    #   "falsetto_enabled": true,
    #   "falsetto_top_note": "A4",
    #   "chest_enabled": false,
    #   "chest_top_note": null
    # }
    def create
      practiced_on =
        begin
          Date.iso8601(create_params[:practiced_on].to_s)
        rescue ArgumentError
          return render json: { errors: [ "practiced_on is invalid. use YYYY-MM-DD" ] }, status: :unprocessable_entity
        end

      log = current_user.training_logs.includes(:training_menus, :training_log_feedback).find_or_initialize_by(practiced_on: practiced_on)
      log_was_new_record = log.new_record?
      had_feedback_before = log.training_log_feedback.present?

      # enabled flags（事故防止のためフロントから送る）
      falsetto_enabled = ActiveModel::Type::Boolean.new.cast(create_params[:falsetto_enabled])
      chest_enabled = ActiveModel::Type::Boolean.new.cast(create_params[:chest_enabled])
      log.falsetto_enabled = falsetto_enabled
      log.chest_enabled = chest_enabled

      # assign
      log.duration_min = create_params[:duration_min]
      log.notes = create_params[:notes]

      # “チェックOFFならNULL”を強制（フロントの送信ミスでも整合する）
      log.falsetto_top_note = falsetto_enabled ? create_params[:falsetto_top_note] : nil
      log.chest_top_note = chest_enabled ? create_params[:chest_top_note] : nil

      # menu_ids を検証して紐付け
      menu_ids = Array(create_params[:menu_ids]).map(&:to_i).uniq
      menus = current_user.training_menus.where(id: menu_ids)
      if menus.size != menu_ids.size
        return render json: { errors: [ "menu_ids contains invalid id" ] }, status: :unprocessable_entity
      end

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

      ActiveRecord::Base.transaction do
        log.save!

        # 差分更新（delete_all + insert で簡単・堅牢。件数が増えるなら upsert_all でもOK）
        log.training_log_menus.delete_all
        now = Time.current
        rows = menu_ids.map do |mid|
          { user_id: current_user.id, training_log_id: log.id, training_menu_id: mid, created_at: now }
        end
        TrainingLogMenu.insert_all!(rows) if rows.any?

        feedback = log.training_log_feedback
        if effect_feedbacks.empty?
          feedback&.destroy!
        else
          feedback ||= log.build_training_log_feedback(user: current_user)
          feedback.menu_effects = effect_feedbacks.map do |entry|
            {
              "menu_id" => entry[:menu_id],
              "improvement_tags" => entry[:improvement_tags]
            }
          end
          feedback.save!
        end
      end

      # includes し直し（serialize で association を使う）
      log = current_user.training_logs.includes(:training_menus, :training_log_menus, :training_log_feedback).find(log.id)
      grants = []
      if log_was_new_record
        grants << { rule_key: "training_log_saved", source_type: "training_log", source_id: log.id }
      end
      if !had_feedback_before && effect_feedbacks.any?
        grants << { rule_key: "training_log_feedback_added", source_type: "training_log_feedback", source_id: log.id }
      end

      rewards =
        if grants.any?
          awarded = Gamification::Awarder.call(user: current_user, grants: grants)
          streak_message_days =
            if log_was_new_record && practiced_on == Date.current && awarded[:streak_current_days].to_i.positive?
              awarded[:streak_current_days].to_i
            else
              nil
            end
          awarded.merge(streak_message_days: streak_message_days)
        else
          nil
        end

      render json: { data: serialize(log), rewards: rewards }, status: :ok
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    private

    def render_day
      date_param = params[:date]
      if date_param.blank?
        return render json: { error: "date is required" }, status: :bad_request
      end

      date =
        begin
          Date.iso8601(date_param)
        rescue ArgumentError
          return render json: { error: "invalid date format. use YYYY-MM-DD" }, status: :bad_request
        end

      log = current_user.training_logs
                        .includes(:training_menus, :training_log_menus, :training_log_feedback)
                        .find_by(practiced_on: date)

      return render json: { data: nil }, status: :ok if log.nil?

      render json: { data: serialize(log) }, status: :ok
    end

    def render_month
      month_param = params[:month].to_s.strip # "YYYY-MM"

      # "YYYY-MM" を厳格にチェック（変な値で全件取得される事故を防ぐ）
      unless /\A\d{4}-\d{2}\z/.match?(month_param)
        return render json: { error: "invalid month format. use YYYY-MM" }, status: :bad_request
      end

      month_date =
        begin
          Date.strptime("#{month_param}-01", "%Y-%m-%d")
        rescue ArgumentError
          return render json: { error: "invalid month value" }, status: :bad_request
        end

      from = month_date.beginning_of_month
      to = month_date.end_of_month

      logs = current_user.training_logs
                         .where(practiced_on: from..to)
                         .includes(:training_menus, :training_log_menus, :training_log_feedback)
                         .order(practiced_on: :desc)

      render json: { data: logs.map { |log| serialize(log) } }, status: :ok
    end

    def create_params
      params.permit(
        :practiced_on,
        :duration_min,
        :notes,
        :falsetto_enabled,
        :falsetto_top_note,
        :chest_enabled,
        :chest_top_note,
        menu_ids: [],
        effect_feedbacks: [ :menu_id, { improvement_tags: [] } ]
      )
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

    def serialize(log)
      # training_log_menus の created_at 順に menu を並べたい
      menus_by_id = log.training_menus.index_by(&:id)
      ordered_menu_ids = log.training_log_menus.map(&:training_menu_id)

      ordered_menus = ordered_menu_ids.filter_map do |mid|
        m = menus_by_id[mid]
        next if m.nil?
        { id: m.id, name: m.name, color: m.color, archived: m.archived }
      end

      {
        id: log.id,
        practiced_on: log.practiced_on.iso8601,
        duration_min: log.duration_min,
        menus: ordered_menus,
        menu_ids: ordered_menu_ids, # フロントの state 用（あっても害なし）
        notes: log.notes,
        falsetto_top_note: log.falsetto_top_note,
        chest_top_note: log.chest_top_note,
        effect_feedbacks: serialize_effect_feedbacks(log),
        effective_menu_ids: log.training_log_feedback&.effective_menu_ids || [],
        improvement_tags: log.training_log_feedback&.improvement_tags || [],
        updated_at: log.updated_at&.iso8601
      }
    end

    def serialize_effect_feedbacks(log)
      feedback = log.training_log_feedback
      return [] unless feedback

      if feedback.menu_effects.present?
        return Array(feedback.menu_effects).filter_map do |entry|
          menu_id = Integer(entry["menu_id"] || entry[:menu_id], exception: false)
          next unless menu_id&.positive?

          tags = Array(entry["improvement_tags"] || entry[:improvement_tags]).map(&:to_s).map(&:strip).reject(&:blank?).uniq
          next if tags.empty?

          { menu_id: menu_id, improvement_tags: tags }
        end
      end

      Array(feedback.effective_menu_ids).filter_map do |menu_id|
        id = Integer(menu_id, exception: false)
        next unless id&.positive?

        tags = Array(feedback.improvement_tags).map(&:to_s).map(&:strip).reject(&:blank?).uniq
        next if tags.empty?

        { menu_id: id, improvement_tags: tags }
      end
    end
  end
end
