# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationGoalTagContextTest < ActiveSupport::TestCase
    test "build merges improvement tags with goal/theme fact matches" do
      user = User.create!(
        email: "goal-tag-context@example.com",
        password: "password123",
        password_confirmation: "password123",
        ai_improvement_tags: [ "pitch_accuracy" ],
        goal_text: "高音の出しやすさを上げたい"
      )

      context = RecommendationGoalTagContext.build(
        user: user,
        explicit_theme: "ミドルで喉が締まるのを減らしたい"
      )

      assert_includes context[:keys], "pitch_accuracy"
      assert_includes context[:keys], "mixed_voice_stability"
      assert_includes context[:keys], "less_throat_tension"
      assert_includes context[:keys], "mixed_voice_stability"
      assert_includes context[:labels], "音程精度"
      assert_includes context[:labels], "ミドルボイス安定"
      assert_equal [ "pitch_accuracy" ], context.dig(:sources, :ai_improvement_tags)
      assert_includes context.dig(:sources, :goal_text), "mixed_voice_stability"
      assert_includes context.dig(:sources, :today_theme), "less_throat_tension"
    end
  end
end
