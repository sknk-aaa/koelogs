# frozen_string_literal: true

module Api
  class AiRecommendationsController < ApplicationController
    before_action :require_login!

    # GET /api/ai_recommendations?date=YYYY-MM-DD
    def show
      date = parse_date!(params[:date])
      range_days = normalize_range_days(params[:range_days])
      rec = current_user.ai_recommendations.find_by(generated_for_date: date, range_days: range_days)
      render json: { data: rec ? serialize(rec) : nil }, status: :ok
    rescue ArgumentError => e
      render json: { error: e.message }, status: :bad_request
    end

    # GET /api/ai_recommendations/history?limit=30
    def history
      limit = params[:limit].to_i
      limit = 30 if limit <= 0
      limit = 100 if limit > 100

      rows = current_user.ai_recommendations
                         .order(generated_for_date: :desc, created_at: :desc)
                         .limit(limit)

      render json: {
        data: rows.map do |rec|
          {
            id: rec.id,
            generated_for_date: rec.generated_for_date.iso8601,
            range_days: rec.range_days,
            recommendation_text_preview: rec.recommendation_text.to_s.gsub(/\s+/, " ").strip.slice(0, 90),
            created_at: rec.created_at.iso8601
          }
        end
      }, status: :ok
    end

    # POST /api/ai_recommendations
    # body: { date: "YYYY-MM-DD", range_days: 14|30|90 }
    def create
      target_date = params[:date].present? ? parse_date!(params[:date]) : Date.current

      range_days = normalize_range_days(params[:range_days])

      existing = current_user.ai_recommendations.find_by(generated_for_date: target_date, range_days: range_days)
      return render json: { data: serialize(existing) }, status: :ok if existing

      include_today = true
      detail_window_days = 14
      from = include_today ? (target_date - (detail_window_days - 1)) : (target_date - detail_window_days)
      to = include_today ? target_date : (target_date - 1)

      logs = current_user.training_logs
                        .where(practiced_on: from..to)
                        .includes(:training_menus)
                        .order(:practiced_on)
      trend_month_count = trend_month_count_for(range_days)
      monthly_logs = monthly_logs_for(target_date: target_date, month_count: trend_month_count)
      measurement_evidence = Ai::MeasurementEvidenceSummary.build(
        user: current_user,
        improvement_tags: current_user.ai_improvement_tags,
        goal_text: current_user.goal_text,
        logs: logs
      )
      collective_effects = Ai::CollectiveEffectCache.fetch(window_days: 90, min_count: 3)

      generator = Ai::RecommendationGenerator.new(
        user: current_user,
        date: target_date,
        range_days: range_days,
        include_today: include_today
      )
      text = generator.generate!(
        logs: logs,
        monthly_logs: monthly_logs,
        measurement_evidence: measurement_evidence,
        selected_range_days: range_days,
        detail_window_days: detail_window_days,
        collective_effects: collective_effects
      )
      collective_summary = build_collective_summary(collective_effects)
      generation_context = build_generation_context(
        target_date: target_date,
        range_days: range_days,
        detail_window_days: detail_window_days,
        logs: logs,
        monthly_logs: monthly_logs,
        measurement_evidence: measurement_evidence,
        collective_summary: collective_summary
      )

      rec = current_user.ai_recommendations.new(
        generated_for_date: target_date,
        range_days: range_days,
        recommendation_text: text,
        collective_summary: collective_summary,
        generation_context: generation_context,
        generator_model_name: generator.model_name,
        generator_prompt_version: generator.prompt_version
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
    rescue Ai::TokenUsageTracker::LimitExceededError => e
      render json: { error: e.message }, status: :unprocessable_entity
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

    def normalize_range_days(raw)
      value = raw.to_i
      return 30 if value == 30
      return 90 if value == 90

      14
    end

    def trend_month_count_for(range_days)
      return 1 if range_days == 30
      return 3 if range_days == 90

      0
    end

    def monthly_logs_for(target_date:, month_count:)
      return MonthlyLog.none if month_count <= 0

      to_month = target_date.beginning_of_month
      from_month = to_month << (month_count - 1)
      current_user.monthly_logs.where(month_start: from_month..to_month).order(:month_start)
    end

    def build_generation_context(target_date:, range_days:, detail_window_days:, logs:, monthly_logs:, measurement_evidence:, collective_summary:)
      {
        target_date: target_date.iso8601,
        selected_range_days: range_days,
        detail_window_days: detail_window_days,
        detailed_logs: logs.map do |log|
          {
            practiced_on: log.practiced_on&.iso8601,
            duration_min: log.duration_min.to_i,
            menus: log.respond_to?(:training_menus) ? log.training_menus.map { |m| m.name.to_s } : [],
            notes: compact_text(log.notes, max_len: 180)
          }
        end,
        monthly_logs: monthly_logs.map do |monthly_log|
          {
            month_start: monthly_log.month_start&.iso8601,
            notes: compact_text(monthly_log.notes, max_len: 220)
          }
        end,
        measurement_evidence: measurement_evidence,
        collective_summary: collective_summary
      }
    end

    def compact_text(text, max_len:)
      v = text.to_s.gsub(/\s+/, " ").strip
      return nil if v.blank?

      v.slice(0, max_len)
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
