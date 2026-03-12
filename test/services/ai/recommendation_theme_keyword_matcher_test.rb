# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationThemeKeywordMatcherTest < ActiveSupport::TestCase
    test "enables community for mapped theme keywords" do
      matched = RecommendationThemeKeywordMatcher.match("換声点を滑らかにしたい")

      assert_equal true, matched[:theme_present]
      assert_equal true, matched[:community_enabled]
      assert_includes Array(matched[:matched_tags]), "mixed_voice_stability"
    end

    test "disables community when no configured keyword exists" do
      matched = RecommendationThemeKeywordMatcher.match("リズムを意識して発声したい")

      assert_equal true, matched[:theme_present]
      assert_equal false, matched[:community_enabled]
      assert_equal [], Array(matched[:matched_tags])
    end
  end
end
