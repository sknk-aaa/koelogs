module Api
  class AiRecommendationsController < ApplicationController
    before_action :require_login!

    # GET /api/ai_recommendations?date=YYYY-MM-DD
    def show
      date = parse_date!(params[:date])
      rec = current_user.ai_recommendations.find_by(generated_for_date: date)
      render json: { data: rec ? serialize(rec) : nil }, status: :ok
    rescue ArgumentError => e
      render json: { error: e.message }, status: :bad_request
    end

    # POST /api/ai_recommendations
    def create
      today = Date.current
      range_days = (params[:range_days].presence || 7).to_i
      range_days = 7 if range_days <= 0

      existing = current_user.ai_recommendations.find_by(generated_for_date: today)
      return render json: { data: serialize(existing) }, status: :ok if existing

      from = today - range_days
      to = today - 1

      logs = current_user.training_logs
                        .where(practiced_on: from..to)
                        .order(:practiced_on)

      text = Ai::RecommendationGenerator.new(
        user: current_user,
        date: today,
        range_days: range_days
      ).generate!(logs: logs)

      rec = current_user.ai_recommendations.new(
        generated_for_date: today,
        range_days: range_days,
        recommendation_text: text
      )

      if rec.save
        render json: { data: serialize(rec) }, status: :created
      else
        render json: { errors: rec.errors.full_messages }, status: :unprocessable_entity
      end
    rescue Gemini::Error => e
      Rails.logger.error("[Gemini] #{e.message} status=#{e.status} body=#{e.body}")
      render json: { error: "AI生成に失敗しました（外部APIエラー）" }, status: :internal_server_error
    rescue => e
      Rails.logger.error("[AI] #{e.class}: #{e.message}\n#{e.backtrace&.first(20)&.join("\n")}")
      render json: { error: "AI生成に失敗しました" }, status: :internal_server_error
    end

    private

    def parse_date!(value)
      raise ArgumentError, "date is required" if value.blank?
      Date.iso8601(value.to_s)
    rescue ArgumentError
      raise ArgumentError, "invalid date format. use YYYY-MM-DD"
    end

    def serialize(rec)
      {
        id: rec.id,
        generated_for_date: rec.generated_for_date.iso8601,
        range_days: rec.range_days,
        recommendation_text: rec.recommendation_text,
        created_at: rec.created_at.iso8601
      }
    end
  end
end
