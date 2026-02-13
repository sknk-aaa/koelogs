module Api
  class TrainingLogsController < ApplicationController
    before_action :require_login!

    # GET /api/training_logs?date=YYYY-MM-DD
    def index
      date_param = params[:date]
      return render json: { error: "date is required" }, status: :bad_request if date_param.blank?

      begin
        date = Date.iso8601(date_param)
      rescue ArgumentError
        return render json: { error: "invalid date format. use YYYY-MM-DD" }, status: :bad_request
      end

      log = current_user.training_logs.find_by(practiced_on: date)
      return render json: { data: nil }, status: :ok if log.nil?

      render json: { data: serialize(log) }, status: :ok
    end

    # POST /api/training_logs  (upsert)
    #
    # body example:
    # {
    #   "practiced_on": "2026-02-13",
    #   "duration_min": 30,
    #   "menus": ["liproll","nay"],
    #   "notes": "memo...",
    #   "falsetto_enabled": true,
    #   "falsetto_top_note": "A4",
    #   "chest_enabled": false,
    #   "chest_top_note": null
    # }
    def create
      begin
        practiced_on = Date.iso8601(create_params[:practiced_on].to_s)
      rescue ArgumentError
        return render json: { errors: [ "practiced_on is invalid. use YYYY-MM-DD" ] }, status: :unprocessable_entity
      end

      log = current_user.training_logs.find_or_initialize_by(practiced_on: practiced_on)

      # enabled flags（事故防止のためフロントから送る）
      falsetto_enabled = ActiveModel::Type::Boolean.new.cast(create_params[:falsetto_enabled])
      chest_enabled    = ActiveModel::Type::Boolean.new.cast(create_params[:chest_enabled])

      log.falsetto_enabled = falsetto_enabled
      log.chest_enabled    = chest_enabled

      # assign
      log.duration_min = create_params[:duration_min]
      log.menus        = create_params[:menus]
      log.notes        = create_params[:notes]

      # “チェックOFFならNULL”を強制（フロントの送信ミスでも整合する）
      log.falsetto_top_note = falsetto_enabled ? create_params[:falsetto_top_note] : nil
      log.chest_top_note    = chest_enabled    ? create_params[:chest_top_note]    : nil

      if log.save
        render json: { data: serialize(log) }, status: :ok
      else
        render json: { errors: log.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def create_params
      # ルート直下で受ける（今のindexの流儀に合わせる）
      params.permit(
        :practiced_on,
        :duration_min,
        :notes,
        :falsetto_enabled,
        :falsetto_top_note,
        :chest_enabled,
        :chest_top_note,
        menus: []
      )
    end

    def serialize(log)
      {
        id: log.id,
        practiced_on: log.practiced_on.iso8601,
        duration_min: log.duration_min,
        menus: log.menus,
        notes: log.notes,
        falsetto_top_note: log.falsetto_top_note,
        chest_top_note: log.chest_top_note,
        updated_at: log.updated_at&.iso8601
      }
    end
  end
end
