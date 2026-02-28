# frozen_string_literal: true

require "test_helper"

module Ai
  class WebSearchDecisionTest < ActiveSupport::TestCase
    test "triggers for explicit request" do
      result = WebSearchDecision.decide(
        query: "Nayについて出典つきで調べて",
        responder_type: :general
      )

      assert_equal true, result[:use_search]
      assert_equal "explicit_request", result[:reason]
    end

    test "triggers for unknown term" do
      result = WebSearchDecision.decide(
        query: "Nayの正しいやり方を教えて",
        responder_type: :general
      )

      assert_equal true, result[:use_search]
      assert_equal "unknown_term", result[:reason]
    end

    test "skips for local context summary question" do
      result = WebSearchDecision.decide(
        query: "今日のログを要約して",
        responder_type: :general
      )

      assert_equal false, result[:use_search]
      assert_equal "local_context_only", result[:reason]
    end
  end
end
