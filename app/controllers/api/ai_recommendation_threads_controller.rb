# frozen_string_literal: true

module Api
  class AiRecommendationThreadsController < ApplicationController
    before_action :require_login!
    before_action :set_recommendation

    # GET /api/ai_recommendations/:id/thread
    def show
      thread = @recommendation.thread
      render json: {
        data: {
          recommendation_id: @recommendation.id,
          generated_for_date: @recommendation.generated_for_date.iso8601,
          can_post: can_post?(thread),
          remaining_messages: remaining_messages_for(thread),
          thread: thread ? serialize_thread(thread) : nil,
          messages: thread ? thread.messages.order(:created_at).map { |m| serialize_message(m) } : []
        }
      }, status: :ok
    end

    # POST /api/ai_recommendations/:id/thread/messages
    # body: { message: "..." }
    def create_message
      unless current_week_recommendation?
        return render json: { errors: [ "今週のおすすめのみ会話できます" ] }, status: :unprocessable_entity
      end

      thread = find_or_create_thread!
      unless can_post?(thread)
        return render json: { errors: [ followup_limit_error_message ] }, status: :unprocessable_entity
      end

      message_text = params[:message].to_s.strip
      if message_text.blank?
        return render json: { errors: [ "message is required" ] }, status: :unprocessable_entity
      end

      if message_text.length > 2000
        return render json: { errors: [ "message is too long (max 2000 chars)" ] }, status: :unprocessable_entity
      end

      if thread.messages.count > (AiRecommendationThread::MAX_MESSAGES - 2)
        return render json: { errors: [ "会話上限に達しました（最大20件）" ] }, status: :unprocessable_entity
      end

      user_message = thread.messages.create!(role: "user", content: message_text)
      Ai::ChatMemoryCandidateRecorder.record_from_message!(
        user: current_user,
        thread: thread,
        user_message: user_message,
        source_kind: "ai_recommendation"
      )
      response_text = Ai::RecommendationFollowupResponder.call(
        recommendation: @recommendation,
        context_snapshot: thread.context_snapshot,
        messages: thread.messages.order(:created_at).last(12)
      )
      assistant_message = thread.messages.create!(role: "assistant", content: response_text.to_s.strip)

      render json: {
        data: {
          recommendation_id: @recommendation.id,
          thread: serialize_thread(thread),
          can_post: can_post?(thread),
          remaining_messages: remaining_messages_for(thread),
          user_message: serialize_message(user_message),
          assistant_message: serialize_message(assistant_message)
        }
      }, status: :created
    rescue => e
      if e.is_a?(Ai::TokenUsageTracker::LimitExceededError)
        return render json: { errors: [ e.message ] }, status: :unprocessable_entity
      end
      if e.is_a?(Gemini::Error) && e.message.include?("timeout")
        return render json: { errors: [ "AI応答が混み合っています。少し時間をおいて再試行してください。" ] }, status: :unprocessable_entity
      end

      Rails.logger.error("[AI][Followup] #{e.class}: #{e.message}\n#{e.backtrace&.first(20)&.join("\n")}")
      render json: { errors: [ "会話の生成に失敗しました" ] }, status: :internal_server_error
    end

    private

    def set_recommendation
      @recommendation = current_user.ai_recommendations.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      render json: { error: "not found" }, status: :not_found
    end

    def find_or_create_thread!
      thread = @recommendation.thread
      return thread if thread

      @recommendation.create_thread!(
        user: current_user,
        generated_for_date: @recommendation.generated_for_date,
        context_snapshot: @recommendation.generation_context,
        seed_recommendation_text: @recommendation.recommendation_text,
        llm_model_name: @recommendation.generator_model_name.presence || Gemini::Client::DEFAULT_MODEL,
        system_prompt_version: AiRecommendationThread::SYSTEM_PROMPT_VERSION,
        user_prompt_version: AiRecommendationThread::USER_PROMPT_VERSION
      )
    end

    def can_post?(thread)
      return false unless current_week_recommendation?
      if current_user.free_plan?
        return true if thread.nil?

        return thread.messages.where(role: "user").count.zero?
      end
      return true if thread.nil?

      thread.messages.count < AiRecommendationThread::MAX_MESSAGES
    end

    def current_week_recommendation?
      @recommendation.week_start_date == Date.current.beginning_of_week(:monday)
    end

    def followup_limit_error_message
      return "1つの今週おすすめにつき、質問は1回までです" if current_user.free_plan?

      "会話上限に達しました（最大20件）"
    end

    def remaining_messages_for(thread)
      used = thread ? thread.messages.count : 0
      remaining = AiRecommendationThread::MAX_MESSAGES - used
      remaining.negative? ? 0 : remaining
    end

    def serialize_thread(thread)
      {
        id: thread.id,
        generated_for_date: thread.generated_for_date.iso8601,
        model_name: thread.llm_model_name,
        system_prompt_version: thread.system_prompt_version,
        user_prompt_version: thread.user_prompt_version,
        created_at: thread.created_at.iso8601
      }
    end

    def serialize_message(message)
      {
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at.iso8601
      }
    end
  end
end
