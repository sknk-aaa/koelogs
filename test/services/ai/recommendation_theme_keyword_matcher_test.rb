# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationThemeKeywordMatcherTest < ActiveSupport::TestCase
    test "enables community only when theme contains configured keywords" do
      matched = RecommendationThemeKeywordMatcher.match("ミドルで力みを減らし、音程を安定させたい")
      assert_equal true, matched[:theme_present]
      assert_equal true, matched[:community_enabled]
      assert_includes matched[:matched_keywords], "力み"
      assert_includes matched[:matched_keywords], "音程"
      assert_includes matched[:matched_tags], "less_throat_tension"
      assert_includes matched[:matched_tags], "pitch_accuracy"

      unmatched = RecommendationThemeKeywordMatcher.match("ミドルボイスの地声感を強くする")
      assert_equal true, unmatched[:theme_present]
      assert_equal false, unmatched[:community_enabled]
      assert_equal [], unmatched[:matched_tags]

      blank = RecommendationThemeKeywordMatcher.match(nil)
      assert_equal false, blank[:theme_present]
      assert_equal false, blank[:community_enabled]
    end
  end
end
