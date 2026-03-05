# frozen_string_literal: true

require "test_helper"
require "ostruct"

module Ai
  class MeasurementEvidenceSummaryTest < ActiveSupport::TestCase
    test "builds evidence for selected improvement tags using latest and averages" do
      user = User.create!(email: "meas-tag@example.com", password: "password123", password_confirmation: "password123")

      6.times do |i|
        run = user.measurement_runs.create!(
          measurement_type: "long_tone",
          include_in_insights: true,
          recorded_at: Time.current - i.hours
        )
        run.create_long_tone_result!(sustain_sec: 10 + i, sustain_note: "A3")
      end

      payload = MeasurementEvidenceSummary.build(
        user: user,
        improvement_tags: [ "long_tone_sustain" ],
        goal_text: "",
        logs: []
      )

      assert_equal true, payload[:used]
      assert_equal 1, payload[:items].size
      item = payload[:items].first
      assert_equal "long_tone", item[:measurement_type]
      assert_equal [ "改善タグ" ], item[:reasons]
      assert_equal 6, item[:count]
      assert item[:facts].any? { |line| line.include?("最新") }
      assert item[:facts].any? { |line| line.include?("直近5回平均") }
    end

    test "uses goal/notes keywords and skips when there is no measurement intent" do
      user = User.create!(email: "meas-note@example.com", password: "password123", password_confirmation: "password123")
      run = user.measurement_runs.create!(
        measurement_type: "volume_stability",
        include_in_insights: true,
        recorded_at: Time.current
      )
      run.create_volume_stability_result!(
        avg_loudness_db: -15.0,
        min_loudness_db: -18.0,
        max_loudness_db: -12.0,
        loudness_range_db: 6.0,
        loudness_range_ratio: 0.4,
        loudness_range_pct: 40.0
      )

      logs = [ OpenStruct.new(notes: "最近は音量の安定を確認したい") ]

      used_payload = MeasurementEvidenceSummary.build(
        user: user,
        improvement_tags: [],
        goal_text: "dBの安定を高めたい",
        logs: logs
      )
      assert_equal true, used_payload[:used]
      assert_equal "volume_stability", used_payload[:items].first[:measurement_type]
      assert_includes used_payload[:items].first[:reasons], "目標"
      assert_includes used_payload[:items].first[:reasons], "自由記述"

      unused_payload = MeasurementEvidenceSummary.build(
        user: user,
        improvement_tags: [],
        goal_text: "リラックスして歌えるようになりたい",
        logs: [ OpenStruct.new(notes: "体をほぐしてから練習した") ]
      )
      assert_equal false, unused_payload[:used]
      assert_equal [], unused_payload[:items]
    end
  end
end
