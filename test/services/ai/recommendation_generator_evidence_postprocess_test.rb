# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationGeneratorEvidencePostprocessTest < ActiveSupport::TestCase
    class FakeClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          1) 今週の方針
          ミドルの安定
          2) 今の状態
          ・テスト
          3) 今週のおすすめメニュー
          リップロール｜10分
          狙い: 喉の脱力
          根拠: コミュニティ（喉の力み軽減）
        TEXT
      end
    end

    class MergeEvidenceClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          1) 今週の方針
          テスト
          2) 今の状態
          ・テスト
          3) 今週のおすすめメニュー
          リップロール｜10分
          やり方: テスト / なぜ有効か: テスト
          根拠: コミュニティ（一致2件）
          コミュニティ原文: 「喉の力みが減ってつながりやすい」
        TEXT
      end
    end

    class MarkdownLooseClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          1) 今週の方針
          テスト
          2) 今の状態
          ・テスト
          3) 今週のおすすめメニュー
          * リップロール｜10分
          * やり方: F#4で軽く流す
          * ハミング｜10分
          * やり方: 喉を開く意識
        TEXT
      end
    end

    class DuplicateReasonClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          1) 今週のテーマ
          テスト
          2) テーマに関しての現状
          ・テスト
          3) 今週のおすすめメニュー
          リップロール｜10分
          やり方: F#4付近で往復 / なぜ有効か: 換声点付近のつながりを安定させるため。
          根拠: Web
          ハミング｜10分
          やり方: 鼻腔共鳴を意識 / なぜ有効か: 換声点付近のつながりを安定させるため。
          根拠: Web
        TEXT
      end
    end

    class MissingStateSlotsClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          1) 今週のテーマ
          F#4あたりの換声点を滑らかにする
          2) テーマに関しての現状
          最近は音程が安定してきました。今週は換声点をさらに滑らかにします。
          3) 今週のおすすめメニュー
          リップロール｜10分
          やり方: F#4付近で往復 / なぜ有効か: 換声点付近のつながりを安定させるため。
          根拠: Web
        TEXT
      end
    end

    class NoisyPreambleClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          こんにちは！今週もよろしくお願いします。
          1) 今週のテーマ
          F#4あたりの換声点
          2) テーマに関しての現状
          現状テキスト
          3) 今週のおすすめメニュー
          今週は次の3つです。
          リップロール｜10分
          やり方: F#4付近で往復 / なぜ有効か: 換声点付近のつながりを安定させるため。
          根拠: Web
          ハミング｜10分
          やり方: 軽く発声 / なぜ有効か: 換声点付近のつながりを安定させるため。
          根拠: Web
          応援しています！
        TEXT
      end
    end

    class StarMenuFormatClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          1) 今週のテーマ
          D4~G4の地声感を強くする
          2) テーマに関しての現状
          現状テキスト
          3) 今週のおすすめメニュー
          ⭐️ ハミング
          10分
          やり方: D4〜G4あたりをゆっくり上下
          ⭐️ Nay（ネイ）エクササイズ
          15分
          やり方: D4〜G4を5トーンで練習
        TEXT
      end
    end

    class MarkdownHeadingClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          こんにちは！
          ### 1) 今週のテーマ
          テーマ
          ### 2) テーマに関しての現状
          現状
          ### 3) 今週のおすすめメニュー
          1. ハミング｜10分
          やり方: テスト / なぜ有効か: 換声点付近のつながりを安定させるため。
          根拠: Web
        TEXT
      end
    end

    class MenuOnlyClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          🗂 今週のメニュー
          Nay（ネイ）発声練習
          10分
          やり方: D4〜G4でネイ発声
          ハミング（母音移行）
          15分
          やり方: ハミングから母音移行
        TEXT
      end
    end

    class RetryOnTimeoutClient
      def initialize
        @calls = 0
      end

      def model_name
        "gemini-2.5-flash"
      end

      def generate_text_with_usage!(system_text:, user_text:, max_output_tokens:, temperature:, user:, feature:, web_search:)
        if feature == "recommendation_web"
          {
            text: '{"insights":[],"menu_hints":[{"name":"ハミング","reason":"共鳴安定"}]}',
            sources: [ { title: "Voice Science Hub", url: "https://example.com/a" } ]
          }
        else
          { text: '{"matched":[]}', sources: [] }
        end
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        @calls += 1
        raise StandardError, "Gemini API timeout: Net::ReadTimeout" if @calls == 1

        <<~TEXT
          1) 今週のテーマ
          テスト
          2) テーマに関しての現状
          現状
          3) 今週のおすすめメニュー
          ハミング｜10分
          やり方: テスト / なぜ有効か: テスト
          根拠: Web
        TEXT
      end
    end

    test "adds site names when web evidence exists and menu evidence is community-only" do
      user = User.create!(
        email: "reco-postprocess@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = FakeClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      goal_tag_original = Ai::RecommendationGoalTagContext.method(:build)
      coverage_original = Ai::RecommendationCommunityCoverage.method(:menu_counts_for_tags)
      web_original = Ai::RecommendationWebEvidence.method(:fetch)

      begin
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build) do |user:, explicit_theme:|
          { keys: [ "less_throat_tension" ], labels: [ "喉の力み軽減" ], sources: {} }
        end
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags) do |goal_tag_keys:, limit:|
          [ { canonical_key: "lip_roll|unspecified", menu_label: "リップロール", count: 1, by_tag: { "less_throat_tension" => 1 } } ]
        end
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch) do |**_kwargs|
          {
            attempted: true,
            used: true,
            intensity: :high,
            insights: [ "SOVTが有効" ],
            menu_hints: [ { name: "リップロール", reason: "脱力" } ],
            sources: [
              { title: "Voice Science Hub", url: "https://example.com/a" },
              { title: "SOVT Guide", url: "https://example.com/b" }
            ]
          }
        end

        text = generator.generate!(
          logs: [],
          collective_effects: { window_days: 90, min_count: 3, rows: [] },
          monthly_logs: [],
          measurement_evidence: { used: false, items: [] },
          selected_range_days: 14,
          detail_window_days: 14,
          explicit_theme: nil
        )

        assert_includes text, "1) 今週のテーマ"
        assert_includes text, "2) テーマに関しての現状"
        assert_includes text, "3) 今週のおすすめメニュー"
        assert_includes text, "根拠: Web"
        assert_includes text, "サイト: Voice Science Hub / SOVT Guide"
      ensure
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build, goal_tag_original)
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags, coverage_original)
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch, web_original)
      end
    end

    test "keeps community quote when evidence line is replaced" do
      user = User.create!(
        email: "reco-quote-keep@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = MergeEvidenceClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      goal_tag_original = Ai::RecommendationGoalTagContext.method(:build)
      coverage_original = Ai::RecommendationCommunityCoverage.method(:menu_counts_for_tags)
      web_original = Ai::RecommendationWebEvidence.method(:fetch)
      build_matches_original = Ai::RecommendationGenerator.instance_method(:build_community_matches)

      begin
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build) do |user:, explicit_theme:|
          { keys: [ "less_throat_tension" ], labels: [ "喉の力み軽減" ], sources: {} }
        end
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags) do |goal_tag_keys:, limit:|
          [ { canonical_key: "lip_roll|unspecified", menu_label: "リップロール", count: 1, by_tag: { "less_throat_tension" => 1 } } ]
        end
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch) do |**_kwargs|
          {
            attempted: true,
            used: true,
            intensity: :high,
            insights: [ "SOVTが有効" ],
            menu_hints: [ { name: "リップロール", reason: "脱力" } ],
            sources: [ { title: "Voice Science Hub", url: "https://example.com/a" } ]
          }
        end
        Ai::RecommendationGenerator.send(:define_method, :build_community_matches) do |community_enabled:, goal_tag_keys:, explicit_theme:, diagnosis_context:|
          {
            matched_menus: [
              {
                canonical_key: "lip_roll|unspecified",
                menu_label: "リップロール",
                matched_count: 2,
                max_score: 0.8,
                methods: [ "喉を開く意識" ],
                reasons: [ "一致" ],
                comment_samples: [ "喉の力みが減ってつながりやすい" ],
                source_post_ids: [ 1, 2 ]
              }
            ],
            alternate_menus: []
          }
        end

        text = generator.generate!(
          logs: [],
          collective_effects: { window_days: 90, min_count: 3, rows: [] },
          monthly_logs: [],
          measurement_evidence: { used: false, items: [] },
          selected_range_days: 14,
          detail_window_days: 14,
          explicit_theme: nil
        )

        assert_includes text, "根拠: 両方"
        assert_includes text, "コミュニティ原文: 「喉の力みが減ってつながりやすい」"
      ensure
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build, goal_tag_original)
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags, coverage_original)
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch, web_original)
        Ai::RecommendationGenerator.send(:define_method, :build_community_matches, build_matches_original)
      end
    end

    test "normalizes markdown bullets and fills missing detail/evidence lines" do
      user = User.create!(
        email: "reco-markdown-fix@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = MarkdownLooseClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      goal_tag_original = Ai::RecommendationGoalTagContext.method(:build)
      coverage_original = Ai::RecommendationCommunityCoverage.method(:menu_counts_for_tags)
      web_original = Ai::RecommendationWebEvidence.method(:fetch)

      begin
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build) do |user:, explicit_theme:|
          { keys: [], labels: [], sources: {} }
        end
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags) do |goal_tag_keys:, limit:|
          []
        end
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch) do |**_kwargs|
          {
            attempted: true,
            used: true,
            intensity: :high,
            insights: [],
            menu_hints: [ { name: "リップロール", reason: "脱力" } ],
            sources: [ { title: "Voice Science Hub", url: "https://example.com/a" } ]
          }
        end

        text = generator.generate!(
          logs: [],
          collective_effects: { window_days: 90, min_count: 3, rows: [] },
          monthly_logs: [],
          measurement_evidence: { used: false, items: [] },
          selected_range_days: 14,
          detail_window_days: 14,
          explicit_theme: nil
        )

        assert_equal 0, text.scan(/\*/).size
        assert_includes text, "失敗時: 詰まりや力みが出たら半音下げて再開"
        assert_operator text.scan(/根拠:/).size, :>=, 2
      ensure
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build, goal_tag_original)
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags, coverage_original)
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch, web_original)
      end
    end

    test "uses web evidence when no community match exists for menu" do
      user = User.create!(
        email: "reco-no-community-match@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = MarkdownLooseClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      goal_tag_original = Ai::RecommendationGoalTagContext.method(:build)
      coverage_original = Ai::RecommendationCommunityCoverage.method(:menu_counts_for_tags)
      web_original = Ai::RecommendationWebEvidence.method(:fetch)
      build_matches_original = Ai::RecommendationGenerator.instance_method(:build_community_matches)

      begin
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build) do |user:, explicit_theme:|
          { keys: [ "passaggio_smoothness" ], labels: [ "換声点の滑らかさ" ], sources: {} }
        end
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags) do |goal_tag_keys:, limit:|
          [ { canonical_key: "lip_roll|unspecified", menu_label: "リップロール", count: 4, by_tag: { "passaggio_smoothness" => 4 } } ]
        end
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch) do |**_kwargs|
          {
            attempted: true,
            used: true,
            intensity: :high,
            insights: [],
            menu_hints: [ { name: "ハミング", reason: "共鳴安定" } ],
            sources: [ { title: "Voice Science Hub", url: "https://example.com/a" } ]
          }
        end
        Ai::RecommendationGenerator.send(:define_method, :build_community_matches) do |community_enabled:, goal_tag_keys:, explicit_theme:, diagnosis_context:|
          { matched_menus: [], alternate_menus: [] }
        end

        text = generator.generate!(
          logs: [],
          collective_effects: { window_days: 90, min_count: 3, rows: [] },
          monthly_logs: [],
          measurement_evidence: { used: false, items: [] },
          selected_range_days: 14,
          detail_window_days: 14,
          explicit_theme: "換声点を滑らかにする"
        )

        assert_includes text, "根拠: Web"
        assert_equal 0, text.scan(/根拠: 両方/).size
      ensure
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build, goal_tag_original)
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags, coverage_original)
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch, web_original)
        Ai::RecommendationGenerator.send(:define_method, :build_community_matches, build_matches_original)
      end
    end

    test "replaces duplicated effect reason with menu specific reason" do
      user = User.create!(
        email: "reco-duplicate-reason@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = DuplicateReasonClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      text = generator.generate!(
        logs: [],
        collective_effects: { window_days: 90, min_count: 3, rows: [] },
        monthly_logs: [],
        measurement_evidence: { used: false, items: [] },
        selected_range_days: 14,
        detail_window_days: 14,
        explicit_theme: nil,
        community_enabled: false
      )

      assert_equal 1, text.scan("換声点付近のつながりを安定させるため。").size
      assert_includes text, "共鳴位置を保ちやすく、地声/裏声の橋渡しで声の段差を減らしやすい。"
    end

    test "does not force five-slot labels into current state section" do
      user = User.create!(
        email: "reco-missing-state-slots@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = MissingStateSlotsClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      text = generator.generate!(
        logs: [],
        collective_effects: { window_days: 90, min_count: 3, rows: [] },
        monthly_logs: [],
        measurement_evidence: { used: false, items: [] },
        selected_range_days: 14,
        detail_window_days: 14,
        explicit_theme: "F#4あたりの換声点を滑らかにする",
        community_enabled: false
      )

      refute_includes text, "発生帯域:"
      refute_includes text, "課題タイプ:"
      refute_includes text, "成功条件:"
      refute_includes text, "破綻条件:"
      refute_includes text, "今回の狙い:"
    end

    test "trims noisy preamble and keeps strict menu layout" do
      user = User.create!(
        email: "reco-noisy-layout@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = NoisyPreambleClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      text = generator.generate!(
        logs: [],
        collective_effects: { window_days: 90, min_count: 3, rows: [] },
        monthly_logs: [],
        measurement_evidence: { used: false, items: [] },
        selected_range_days: 14,
        detail_window_days: 14,
        explicit_theme: nil,
        community_enabled: false
      )

      refute_includes text, "こんにちは！"
      refute_includes text, "今週は次の3つです。"
      refute_includes text, "応援しています！"
      assert_includes text, "1) 今週のテーマ"
      assert_includes text, "2) テーマに関しての現状"
      assert_includes text, "3) 今週のおすすめメニュー"
      assert_includes text, "リップロール"
      assert_includes text, "ハミング"
      assert_equal 0, text.scan(/｜\d+\s*分/).size
    end

    test "keeps slash inside reason text without splitting sentence" do
      user = User.create!(
        email: "reco-reason-slash@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: DuplicateReasonClient.new
      )

      text = generator.send(
        :normalize_menu_detail_line,
        "やり方: テスト / なぜ有効か: 共鳴位置を保ちやすく、地声/裏声の橋渡しで声の段差を減らしやすい。 / 失敗時: 詰まりや力みが出たら半音下げて再開",
        menu_name: "ハミング"
      )

      assert_includes text, "なぜ有効か: 共鳴位置を保ちやすく、地声/裏声の橋渡しで声の段差を減らしやすい。"
      assert_equal 3, text.split("\n").size
    end

    test "adds evidence lines for star menu format with separate duration lines" do
      user = User.create!(
        email: "reco-star-menu-format@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = StarMenuFormatClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      text = generator.generate!(
        logs: [],
        collective_effects: { window_days: 90, min_count: 3, rows: [] },
        monthly_logs: [],
        measurement_evidence: { used: false, items: [] },
        selected_range_days: 14,
        detail_window_days: 14,
        explicit_theme: nil,
        community_enabled: false
      )

      assert_includes text, "ハミング"
      assert_includes text, "Nay（ネイ）エクササイズ"
      assert_operator text.scan(/^根拠:/).size, :>=, 2
    end

    test "normalizes markdown heading style sections and removes preamble" do
      user = User.create!(
        email: "reco-markdown-heading@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = MarkdownHeadingClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      text = generator.generate!(
        logs: [],
        collective_effects: { window_days: 90, min_count: 3, rows: [] },
        monthly_logs: [],
        measurement_evidence: { used: false, items: [] },
        selected_range_days: 14,
        detail_window_days: 14,
        explicit_theme: nil,
        community_enabled: false
      )

      refute_includes text, "こんにちは！"
      assert_includes text, "1) 今週のテーマ"
      assert_includes text, "2) テーマに関しての現状"
      assert_includes text, "3) 今週のおすすめメニュー"
      assert_includes text, "ハミング"
    end

    test "injects evidence even when menu section heading is missing" do
      user = User.create!(
        email: "reco-menu-only@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = MenuOnlyClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      text = generator.generate!(
        logs: [],
        collective_effects: { window_days: 90, min_count: 3, rows: [] },
        monthly_logs: [],
        measurement_evidence: { used: false, items: [] },
        selected_range_days: 14,
        detail_window_days: 14,
        explicit_theme: nil,
        community_enabled: false
      )

      assert_includes text, "Nay（ネイ）発声練習"
      assert_includes text, "ハミング（母音移行）"
      assert_operator text.scan(/^根拠:/).size, :>=, 2
    end

    test "retries once when recommendation generation times out" do
      user = User.create!(
        email: "reco-timeout-retry@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = RetryOnTimeoutClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      text = generator.generate!(
        logs: [],
        collective_effects: { window_days: 90, min_count: 3, rows: [] },
        monthly_logs: [],
        measurement_evidence: { used: false, items: [] },
        selected_range_days: 14,
        detail_window_days: 14,
        explicit_theme: nil,
        community_enabled: false
      )

      assert_includes text, "1) 今週のテーマ"
      assert_includes text, "ハミング"
    end
  end
end
