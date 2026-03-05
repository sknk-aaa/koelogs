# frozen_string_literal: true

require "test_helper"

module Api
  class AiRecommendationThreadsTest < ActionDispatch::IntegrationTest
    test "can read thread and post followup for today's recommendation" do
      post "/api/auth/signup", params: {
        email: "followup-user@example.com",
        password: "password123",
        password_confirmation: "password123"
      }
      assert_response :created

      user = User.find_by!(email: "followup-user@example.com")
      recommendation = user.ai_recommendations.create!(
        generated_for_date: Date.current,
        range_days: 14,
        recommendation_text: "提案本文",
        collective_summary: { used: false, items: [] },
        generation_context: { selected_range_days: 14 },
        generator_model_name: "gemini-2.5-flash",
        generator_prompt_version: "recommendation-v1"
      )

      get "/api/ai_recommendations/#{recommendation.id}/thread"
      assert_response :ok
      body = JSON.parse(@response.body)
      assert_equal true, body.dig("data", "can_post")
      assert_equal 20, body.dig("data", "remaining_messages")
      assert_equal [], body.dig("data", "messages")

      original_call = Ai::RecommendationFollowupResponder.method(:call)
      Ai::RecommendationFollowupResponder.singleton_class.send(:define_method, :call) do |recommendation:, context_snapshot:, messages:|
        "調整案: 今日は前半を短くしましょう"
      end

      begin
        post "/api/ai_recommendations/#{recommendation.id}/thread/messages", params: { message: "最初を短めにしたい" }
        assert_response :created
        post_body = JSON.parse(@response.body)
        assert_equal "user", post_body.dig("data", "user_message", "role")
        assert_equal "assistant", post_body.dig("data", "assistant_message", "role")
        assert_equal 18, post_body.dig("data", "remaining_messages")
      ensure
        Ai::RecommendationFollowupResponder.singleton_class.send(:define_method, :call, original_call)
      end
    end

    test "rejects posting to non-current-week recommendation and over-limit thread" do
      post "/api/auth/signup", params: {
        email: "followup-limit@example.com",
        password: "password123",
        password_confirmation: "password123"
      }
      assert_response :created

      user = User.find_by!(email: "followup-limit@example.com")

      old_recommendation = user.ai_recommendations.create!(
        generated_for_date: Date.current - 8,
        range_days: 14,
        recommendation_text: "先週の提案",
        collective_summary: { used: false, items: [] },
        generation_context: {},
        generator_model_name: "gemini-2.5-flash",
        generator_prompt_version: "recommendation-v1"
      )

      post "/api/ai_recommendations/#{old_recommendation.id}/thread/messages", params: { message: "質問" }
      assert_response :unprocessable_entity

      today_recommendation = user.ai_recommendations.create!(
        generated_for_date: Date.current,
        range_days: 30,
        recommendation_text: "今日の提案",
        collective_summary: { used: false, items: [] },
        generation_context: {},
        generator_model_name: "gemini-2.5-flash",
        generator_prompt_version: "recommendation-v1"
      )
      thread = today_recommendation.create_thread!(
        user: user,
        generated_for_date: Date.current,
        context_snapshot: {},
        seed_recommendation_text: today_recommendation.recommendation_text,
        llm_model_name: "gemini-2.5-flash",
        system_prompt_version: "followup-v1",
        user_prompt_version: "followup-v1"
      )
      20.times do |i|
        thread.messages.create!(role: i.even? ? "user" : "assistant", content: "msg-#{i}")
      end

      post "/api/ai_recommendations/#{today_recommendation.id}/thread/messages", params: { message: "もう一度質問" }
      assert_response :unprocessable_entity
    end
  end
end
