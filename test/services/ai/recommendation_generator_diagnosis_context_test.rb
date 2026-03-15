# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationGeneratorDiagnosisContextTest < ActiveSupport::TestCase
    class DummyClient
    end

    class AiSlotClient
      def generate_text_with_usage!(system_text:, user_text:, max_output_tokens:, temperature:, user:, feature:, web_search:)
        {
          text: <<~JSON
            {
              "band":"F#4付近（近傍: E4 / F4 / F#4 / G4 / G#4）",
              "challenge":"上行時の詰まり / 喉前側の力み",
              "success":"裏声先行で通る",
              "breakdown":"上行で音量を急に上げると崩れる",
              "focus":"上行時の詰まりを減らす"
            }
          JSON
        }
      end
    end

    test "builds five-slot diagnosis context with nearby pitch notes" do
      user = User.create!(
        email: "reco-diagnosis-slot@example.com",
        password: "password123",
        password_confirmation: "password123",
        goal_text: "喉を閉めずにミドルを出す"
      )

      log = TrainingLog.create!(
        user: user,
        practiced_on: Date.current,
        duration_min: 20,
        notes: "F#4で上行すると詰まりやすい。裏声先行だと通る。音量を上げると力みが出る。"
      )

      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: DummyClient.new
      )

      text = generator.send(
        :build_diagnosis_context,
        logs: [ log ],
        measurement_evidence: { used: false, items: [] },
        explicit_theme: "F#4付近の換声点を滑らかにする",
        goal_tag_context: { labels: [ "換声点の滑らかさ" ] }
      )

      assert_includes text, "5スロット診断"
      assert_includes text, "発生帯域: F#4付近（近傍: E4 / F4 / F#4 / G4 / G#4）"
      assert_includes text, "課題タイプ: 改善ターゲット: F#4付近の換声点を滑らかにする"
      assert_includes text, "成功条件:"
      assert_includes text, "破綻条件:"
      assert_includes text, "今回の狙い: F#4付近の換声点を滑らかにする"
    end

    test "uses ai generated diagnosis slots when available" do
      user = User.create!(
        email: "reco-diagnosis-slot-ai@example.com",
        password: "password123",
        password_confirmation: "password123",
        goal_text: "喉を閉めずにミドルを出す"
      )

      log = TrainingLog.create!(
        user: user,
        practiced_on: Date.current,
        duration_min: 20,
        notes: "F#4で上行時に詰まり。裏声先行は通る。"
      )

      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: AiSlotClient.new
      )

      text = generator.send(
        :build_diagnosis_context,
        logs: [ log ],
        measurement_evidence: { used: false, items: [] },
        explicit_theme: "F#4付近の換声点を滑らかにする",
        goal_tag_context: { labels: [ "換声点の滑らかさ" ] }
      )

      assert_includes text, "発生帯域: F#4付近（近傍: E4 / F4 / F#4 / G4 / G#4）"
      assert_includes text, "課題タイプ: 上行時の詰まり / 喉前側の力み"
      assert_includes text, "成功条件: 裏声先行で通る"
      assert_includes text, "破綻条件: 上行で音量を急に上げると崩れる"
      assert_includes text, "今回の狙い: 上行時の詰まりを減らす"
    end

    test "does not use off-theme notes for success condition in fallback" do
      user = User.create!(
        email: "reco-theme-scope@example.com",
        password: "password123",
        password_confirmation: "password123",
        goal_text: "喉を閉めずにミドルを出す"
      )

      logs = [
        TrainingLog.create!(
          user: user,
          practiced_on: Date.current - 1,
          duration_min: 20,
          notes: "音程の安定が前月より良い。"
        ),
        TrainingLog.create!(
          user: user,
          practiced_on: Date.current,
          duration_min: 20,
          notes: "息漏れを減らす練習。"
        )
      ]

      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: DummyClient.new
      )

      text = generator.send(
        :build_diagnosis_context,
        logs: logs,
        measurement_evidence: { used: false, items: [] },
        explicit_theme: "ミドルボイス（D4~G4あたり）の地声感を強くする",
        goal_tag_context: { labels: [ "換声点の滑らかさ" ] }
      )

      refute_match(/成功条件: .*音程の安定/, text)
    end

    test "keeps explicit pitch range from theme in fallback band" do
      user = User.create!(
        email: "reco-theme-range@example.com",
        password: "password123",
        password_confirmation: "password123",
        goal_text: "ミドルボイスの地声感を強くする"
      )

      log = TrainingLog.create!(
        user: user,
        practiced_on: Date.current,
        duration_min: 20,
        notes: "D4〜G4を丁寧に練習した。"
      )

      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: DummyClient.new
      )

      text = generator.send(
        :build_diagnosis_context,
        logs: [ log ],
        measurement_evidence: { used: false, items: [] },
        explicit_theme: "ミドルボイス（D4~G4あたり）の地声感を強くする",
        goal_tag_context: { labels: [ "換声点の滑らかさ" ] }
      )

      assert_includes text, "発生帯域: D4〜G4（近傍: C4〜A4）"
    end
  end
end
