# frozen_string_literal: true

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
    # body: { date: "YYYY-MM-DD", range_days: 7 }
    def create
      target_date = params[:date].present? ? parse_date!(params[:date]) : Date.current

      range_days = (params[:range_days].presence || 7).to_i
      range_days = 7 if range_days <= 0

      existing = current_user.ai_recommendations.find_by(generated_for_date: target_date)
      return render json: { data: serialize(existing) }, status: :ok if existing

      include_today = true
      from = include_today ? (target_date - (range_days - 1)) : (target_date - range_days)
      to = include_today ? target_date : (target_date - 1)

      logs = current_user.training_logs
                        .where(practiced_on: from..to)
                        .includes(:training_menus)
                        .order(:practiced_on)
      collective_effects = Ai::CollectiveEffectSummary.new(window_days: 90, min_count: 3).build

      text = Ai::RecommendationGenerator.new(
        user: current_user,
        date: target_date,
        range_days: range_days,
        include_today: include_today
      ).generate!(logs: logs, collective_effects: collective_effects)
      collective_summary = build_collective_summary(collective_effects)

      rec = current_user.ai_recommendations.new(
        generated_for_date: target_date,
        range_days: range_days,
        recommendation_text: text,
        collective_summary: collective_summary
      )

      if rec.save
        begin
          Ai::ContributionTracker.new(ai_recommendation: rec, collective_effects: collective_effects).record!
        rescue => e
          Rails.logger.error("[AI][ContributionTracker] #{e.class}: #{e.message}")
        end
        rewards = Gamification::Awarder.call(
          user: current_user,
          grants: [ { rule_key: "ai_recommendation_generated", source_type: "ai_recommendation", source_id: rec.id } ]
        )
        render json: { data: serialize(rec), rewards: rewards }, status: :created
      else
        render json: { errors: rec.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ArgumentError => e
      render json: { error: e.message }, status: :bad_request
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
        collective_summary: collective_summary_payload_for(rec.collective_summary),
        created_at: rec.created_at.iso8601
      }
    end

    def default_collective_summary
      {
        used: false,
        window_days: 90,
        min_count: 3,
        items: []
      }
    end

    def collective_summary_payload_for(raw)
      return nil unless raw.is_a?(Hash)
      used = raw[:used]
      used = raw["used"] if used.nil?
      return nil unless used == true || used == false

      raw
    end

    def build_collective_summary(collective_effects)
      rows = Array(collective_effects[:rows])
      window_days = collective_effects[:window_days].to_i
      min_count = collective_effects[:min_count].to_i

      return default_collective_summary.merge(window_days: window_days, min_count: min_count) if rows.blank?

      items = rows.first(3).map do |row|
        menus = Array(row[:top_menus]).first(2).map do |menu|
          {
            menu_label: menu[:display_label].presence || menu[:canonical_key].to_s,
            count: menu[:count].to_i,
            scale_distribution: Array(menu[:top_scales]).map { |s| { label: s[:label].to_s, count: s[:count].to_i } },
            detail_comments: Array(menu[:detail_samples]).map(&:to_s),
            detail_keywords: Array(menu[:detail_keywords]).map { |k| k[:label].to_s },
            detail_patterns: {
              improved: Array(menu.dig(:detail_patterns, :improved)).map { |v| v[:text].to_s },
              range: Array(menu.dig(:detail_patterns, :range)).map { |v| v[:text].to_s },
              focus: Array(menu.dig(:detail_patterns, :focus)).map { |v| v[:text].to_s }
            }
          }
        end
        {
          tag_key: row[:tag_key].to_s,
          tag_label: row[:tag_label].to_s,
          menus: menus
        }
      end

      {
        used: true,
        window_days: window_days,
        min_count: min_count,
        items: items
      }
    end
  end
end
