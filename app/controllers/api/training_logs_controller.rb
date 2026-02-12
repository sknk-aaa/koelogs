module Api
  class TrainingLogsController < ApplicationController
    # GET /api/training_logs?date=YYYY-MM-DD
    def index
      date_param = params[:date]
      return render json: { error: "date is required" }, status: :bad_request if date_param.blank?

      begin
        date = Date.iso8601(date_param)
      rescue ArgumentError
        return render json: { error: "invalid date format. use YYYY-MM-DD" }, status: :bad_request
      end

      log = TrainingLog.find_by(practiced_on: date)
      return render json: { data: nil }, status: :ok if log.nil?

      render json: {
        data: serialize(log)
      }, status: :ok
    end

    private

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
