# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationMenuConsolidatorTest < ActiveSupport::TestCase
    test "consolidates same menu and keeps method variants" do
      ranked = [
        {
          id: 1,
          score: 0.88,
          reason: "換声点で息漏れが出る記述と一致",
          candidate: {
            canonical_key: "lip_roll|unspecified",
            menu_label: "リップロール",
            comment: "意識した点: 息漏れを減らす\nやり方: G4付近で軽く往復"
          }
        },
        {
          id: 2,
          score: 0.81,
          reason: "地声/裏声の接続課題と一致",
          candidate: {
            canonical_key: "lip_roll|unspecified",
            menu_label: "リップロール",
            comment: "意識したポイント: 力みを抜く\nやり方: E4-F#4で3往復"
          }
        },
        {
          id: 3,
          score: 0.7,
          reason: "次点",
          candidate: {
            canonical_key: "humming|unspecified",
            menu_label: "ハミング",
            comment: "やり方: 鼻腔共鳴を意識"
          }
        }
      ]

      out = RecommendationMenuConsolidator.consolidate(ranked)

      assert_equal 2, out.size
      first = out.first
      assert_equal "lip_roll|unspecified", first[:canonical_key]
      assert_equal "リップロール", first[:menu_label]
      assert_equal 2, first[:matched_count]
      assert_equal [ 1, 2 ], first[:source_post_ids]
      assert_operator first[:methods].size, :>=, 2
      assert_includes first[:reasons].join(" / "), "一致"
      assert_operator first[:comment_samples].size, :>=, 2
    end
  end
end
