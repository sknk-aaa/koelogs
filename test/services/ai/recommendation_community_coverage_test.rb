# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationCommunityCoverageTest < ActiveSupport::TestCase
    test "counts published posts matching goal tags across all time" do
      user = User.create!(email: "community-coverage@example.com", password: "password123", password_confirmation: "password123")
      menu = user.training_menus.create!(name: "リップロール")

      CommunityPost.create!(
        user: user,
        training_menu: menu,
        improvement_tags: [ "pitch_accuracy" ],
        effect_level: 4,
        used_scale_type: "five_tone",
        published: true,
        created_at: 2.years.ago
      )
      CommunityPost.create!(
        user: user,
        training_menu: menu,
        improvement_tags: [ "pitch_accuracy", "less_throat_tension" ],
        effect_level: 5,
        used_scale_type: "triad",
        published: true,
        created_at: 1.year.ago
      )
      CommunityPost.create!(
        user: user,
        training_menu: menu,
        improvement_tags: [ "pitch_accuracy" ],
        effect_level: 3,
        used_scale_type: "five_tone",
        published: false
      )

      count = RecommendationCommunityCoverage.count_matching_posts(goal_tag_keys: [ "pitch_accuracy" ])
      assert_equal 2, count
    end
  end
end
