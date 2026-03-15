# frozen_string_literal: true

require "json"
require "uri"

module Ai
  class RecommendationGenerator
    PROMPT_VERSION = "recommendation-v1"
    PROMPT_PRIORITY_LINES = [
      "1) ユーザーのカスタム指示（回答スタイル要求）",
      "2) ボイトレメモリ（AI要約 + ユーザー編集）",
      "3) ユーザー目標（goal_text）",
      "4) 目標タグ（目標/テーマ/改善項目のユーザー事実）",
      "5) 診断レイヤー（直近ログ/測定/月傾向）",
      "6) 根拠探索レイヤー（コミュニティ一致優先 + 不足時補完）"
    ].freeze

    def initialize(user:, date:, range_days: 14, include_today: false, client: Gemini::Client.new)
      @user = user
      @date = date
      @range_days = range_days
      @include_today = include_today
      @client = client
    end

    def generate!(logs:, collective_effects:, monthly_logs:, measurement_evidence:, selected_range_days:, detail_window_days:, explicit_theme: nil, community_enabled: true, community_tag_keys: [])
      explicit_theme_text = explicit_theme.to_s.gsub(/\s+/, " ").strip.presence
      community_enabled_flag = community_enabled == true
      collective_used = community_enabled_flag && collective_knowledge_used?(collective_effects)
      measurement_used = measurement_used?(measurement_evidence)

      goal_tag_context = Ai::RecommendationGoalTagContext.build(user: @user, explicit_theme: explicit_theme_text)
      effective_community_tag_keys =
        if community_enabled_flag
          normalize_tag_keys(community_tag_keys).presence || goal_tag_context[:keys]
        else
          []
        end

      community_menu_counts =
        if community_enabled_flag && effective_community_tag_keys.any?
          Ai::RecommendationCommunityCoverage.menu_counts_for_tags(goal_tag_keys: effective_community_tag_keys, limit: 8)
        else
          []
        end
      top_menu_count = community_menu_counts.map { |row| row[:count].to_i }.max.to_i

      diagnosis_context = build_diagnosis_context(
        logs: logs,
        measurement_evidence: measurement_evidence,
        explicit_theme: explicit_theme_text,
        goal_tag_context: goal_tag_context
      )

      community_matches = build_community_matches(
        community_enabled: community_enabled_flag,
        goal_tag_keys: effective_community_tag_keys,
        explicit_theme: explicit_theme_text,
        diagnosis_context: diagnosis_context
      )

      personal_menu_evidence =
        if community_enabled_flag
          Ai::RecommendationPersonalMenuEvidence.extract(
            logs: logs,
            explicit_theme: explicit_theme_text,
            goal_text: @user.goal_text
          )
        else
          []
        end

      web_needed = web_supplement_needed?(
        community_enabled: community_enabled_flag,
        community_matches: community_matches,
        personal_menu_evidence: personal_menu_evidence
      )
      web_intensity = community_enabled_flag ? (top_menu_count < 5 ? :high : :light) : :high
      web_evidence =
        if web_needed
          Ai::RecommendationWebEvidence.fetch(
            user: @user,
            goal_text: @user.goal_text,
            explicit_theme: explicit_theme_text,
            goal_tag_labels: goal_tag_context[:labels],
            recent_logs: logs,
            intensity: web_intensity,
            client: @client
          )
        else
          {
            attempted: false,
            used: false,
            intensity: :light,
            insights: [],
            menu_hints: [],
            sources: []
          }
        end

      candidate_plan = build_candidate_plan(
        community_enabled: community_enabled_flag,
        community_matches: community_matches,
        personal_menu_evidence: personal_menu_evidence,
        web_evidence: web_evidence
      )

      system = build_system_text(
        collective_used: collective_used,
        measurement_used: measurement_used,
        explicit_theme: explicit_theme_text,
        top_menu_count: top_menu_count,
        web_intensity: web_intensity,
        community_enabled: community_enabled_flag
      )

      payload = build_user_text(
        logs,
        collective_effects,
        collective_used: collective_used,
        monthly_logs: monthly_logs,
        measurement_evidence: measurement_evidence,
        selected_range_days: selected_range_days,
        detail_window_days: detail_window_days,
        explicit_theme: explicit_theme_text,
        goal_tag_context: goal_tag_context,
        community_menu_counts: community_menu_counts,
        top_menu_count: top_menu_count,
        web_intensity: web_intensity,
        web_evidence: web_evidence,
        community_enabled: community_enabled_flag,
        diagnosis_context: diagnosis_context,
        community_matches: community_matches,
        personal_menu_evidence: personal_menu_evidence,
        candidate_plan: candidate_plan
      )

      generated_text = generate_recommendation_text_with_retry(system_text: system, user_text: payload)

      finalize_recommendation_text(
        generated_text,
        web_evidence: web_evidence,
        community_menu_counts: community_menu_counts,
        community_enabled: community_enabled_flag,
        community_quotes: build_community_quotes_by_menu(community_matches),
        community_match_counts: build_community_match_counts_by_menu(community_matches),
        diagnosis_context: diagnosis_context,
        explicit_theme: explicit_theme_text
      )
    end

    def model_name
      return @client.model_name if @client.respond_to?(:model_name)

      Gemini::Client::DEFAULT_MODEL
    end

    def prompt_version
      PROMPT_VERSION
    end

    private

    def generate_recommendation_text_with_retry(system_text:, user_text:)
      max_output_tokens = 5_000
      attempts = 0

      begin
        attempts += 1
        @client.generate_text!(
          user_text: user_text,
          system_text: system_text,
          max_output_tokens: max_output_tokens,
          temperature: 0.5,
          user: @user,
          feature: "recommendation"
        )
      rescue => e
        raise unless timeout_error?(e)
        raise if attempts >= 2

        max_output_tokens = 3_500
        Rails.logger.warn("[AI][RecommendationGenerator] retry_recommendation_after_timeout attempt=#{attempts} user_id=#{@user.id}")
        sleep(0.2)
        retry
      end
    end

    def timeout_error?(error)
      error.to_s.include?("timeout") || error.to_s.include?("ReadTimeout")
    end

    def web_supplement_needed?(community_enabled:, community_matches:, personal_menu_evidence:)
      return true unless community_enabled

      keys = []
      keys.concat(Array(community_matches[:matched_menus]).map { |row| row[:canonical_key].to_s })
      keys.concat(Array(community_matches[:alternate_menus]).map { |row| row[:canonical_key].to_s })
      keys.concat(Array(personal_menu_evidence).map { |row| row[:canonical_key].to_s })
      unique_count = keys.reject(&:blank?).uniq.size

      unique_count < 3
    end

    def build_system_text(collective_used:, measurement_used:, explicit_theme:, top_menu_count:, web_intensity:, community_enabled:)
      custom_instruction_line =
        if user_custom_instructions.present?
          <<~RULES
            - ユーザーは次のカスタム指示を設定しています。これは「回答スタイル要求」として最優先で反映してください。
            - ここにある内容は、主にトーン・説明の粒度・厳しさ・表現形式を制御する指示として扱ってください。
              "#{user_custom_instructions}"
          RULES
        else
          "- ユーザーのカスタム指示は未設定です。"
        end

      structured_style_rule =
        if user_custom_instructions.present?
          <<~RULES
            - 構造化された回答スタイル設定は次の通りです。カスタム指示で不足する部分の補助としてのみ使ってください。
              #{Ai::ResponseStylePreferences.summary_text(@user.ai_response_style_prefs).lines.map { |line| "  #{line}" }.join}
          RULES
        else
          rules = Ai::ResponseStylePreferences.prompt_rules(@user.ai_response_style_prefs)
          <<~RULES
            - ユーザーの構造化スタイル設定:
              #{Ai::ResponseStylePreferences.summary_text(@user.ai_response_style_prefs).lines.map { |line| "  #{line}" }.join}
            #{rules.map { |line| "  #{line}" }.join("\n")}
          RULES
        end

      long_term_profile_text = Ai::UserLongTermProfileManager.profile_text_for_prompt(user: @user)
      long_term_profile_rule =
        if long_term_profile_text.present?
          <<~RULES
            - ユーザー本人の特性（強み・課題・成長過程）は、カスタム指示よりもボイトレメモリを優先して参照してください。
            - ボイトレメモリの各行には `[w=0.xx]` が付くことがあります。wが高い行ほど優先度が高い（最新寄り）ものとして扱ってください。
            - ただし「避けたい練習/注意点」は安全上の重要情報として常に高優先で扱ってください。
            - ボイトレメモリ:
              #{long_term_profile_text.lines.map { |line| "  #{line}" }.join}
          RULES
        else
          "- ユーザーのボイトレメモリは未作成です。"
        end

      user_improvement_tag_rule =
        if user_improvement_tags.any?
          labels = user_improvement_tags.filter_map { |tag| ImprovementTagCatalog::LABELS[tag] }.join(" / ")
          <<~RULES
            - ユーザーが改善したい項目として選択したタグは「#{labels}」です。
            - 目標・ログ・集合知と矛盾しない範囲で、このタグに関連する改善観点を優先してください。
          RULES
        else
          "- ユーザーの改善したい項目は未設定です。"
        end

      explicit_theme_rule =
        if explicit_theme.present?
          <<~RULES
            - 今回はユーザーが今週のテーマを明示しています。AIが別テーマを新規に決めないこと。
            - 1) 今週のテーマには、次の文を必ず含める（大幅な言い換え禁止）:
              #{explicit_theme}
            - 2) テーマに関しての現状 と 3) 今週のおすすめメニュー は、このテーマ達成の具体化に集中する。
          RULES
        else
          <<~RULES
            - ユーザーが今週テーマを未指定の場合は、ログと目標から今週のテーマを提案してよい。
          RULES
        end

      exploration_rule_block =
        if !community_enabled
          <<~RULES
            - 根拠探索レイヤーではコミュニティを使わない。Webを主根拠として候補を探す。
            - 3) 今週のおすすめメニューには、Web補完で得た候補を必ず含める。
          RULES
        elsif web_intensity == :high
          <<~RULES
            - 根拠探索レイヤーは「コミュニティ一致優先 + 不足分を補完」で組み立てる。
            - コミュニティ一致が薄い場合は、Web補完の比重を上げる（今回の最大件数: #{top_menu_count}）。
          RULES
        else
          <<~RULES
            - 根拠探索レイヤーは「コミュニティ一致優先 + 不足分を補完」で組み立てる。
            - コミュニティ一致が十分あるため、Webは補助として扱う（今回の最大件数: #{top_menu_count}）。
          RULES
        end

      collective_rule_block =
        if collective_used
          <<~RULES
            - コミュニティ由来の提案では、自由記述に基づく具体的なやり方を書く。
            - 同一メニューが複数候補ある場合は、1枠に統合し「やり方A（目的）/やり方B（目的）」で示す。
          RULES
        else
          "- 今回はコミュニティ一致候補が弱いため、コミュニティ根拠の断定は避ける。"
        end

      measurement_rule_block =
        if measurement_used
          <<~RULES
            - 測定結果データは観測事実として扱い、ログ文脈と矛盾しない範囲で根拠に使う。
            - 測定回数が少ない指標（count < 5）は参考値として扱い、断定しない。
          RULES
        else
          "- 測定結果データがない場合、測定に基づく断定は行わない。"
        end

      goal_line =
        if @user.respond_to?(:goal_text) && @user.goal_text.present?
          <<~GOAL
            追加条件（ユーザー目標）:
            - ユーザーの目標は「#{@user.goal_text}」です。
            - 今週のおすすめは「この目標達成」を最優先に組み立ててください。
          GOAL
        else
          ""
        end

      <<~SYS
        あなたはボイストレーニング支援アプリのコーチです。
        目的: ユーザー目標の達成を最優先に、今週の練習メニューのおすすめを日本語で作成してください。

        重要ルール:
        - 優先順位は次の順です:
          #{PROMPT_PRIORITY_LINES.join("\n  ")}
        - 回答は基本的に優しい口調で行い、安心感のある言い回しを優先する。
        - ただし、ユーザーのカスタム指示がある場合は、回答スタイルについてその指示を最優先する。
        - ユーザーへの呼びかけが必要な場合は「#{user_call_name}」を使う。display_name未設定時は「あなた」を使う。
        #{custom_instruction_line}
        #{structured_style_rule}
        #{long_term_profile_rule}
        #{user_improvement_tag_rule}
        - 2) では “不足/足りない” という表現を避け、観測できる事実 + 今週の狙いで書く。
        - 2) テーマに関しての現状 は固定ラベルで箇条書きにせず、観測事実に基づく自然な文章で記述する。
        - 診断レイヤーの要点（発生帯域/課題タイプ/成功条件/破綻条件/今回の狙い）は内部材料として使うが、出力時にその見出しを必ず表示する必要はない。
        - 2) の冒頭1〜2文は、今週テーマとの直接接続を明示する（テーマ語を明示して言及）。
        - 2) ではテーマと関係の薄い話題へ脱線しない。テーマ達成に関係する事実と次の一手に集中する。
        - 3) ではメニュー名だけで終わらせず、具体的なやり方（手順/音域/注意点）と、なぜ有効かを書く。
        #{exploration_rule_block}
        #{collective_rule_block}
        #{measurement_rule_block}
        - 候補選定は「一致投稿 > 次点コミュニティ > 個人実績 > Web補完」の順を守る。
        - 一致投稿が1件以上ある場合は、3)に必ず1件以上含める。
        - 2行目の「やり方」は必ず具体化する:
          音域(開始音/目安キー)・手順・注意点(失敗時の修正)を短く含める。
        - 2行目には必ず「なぜ有効か」を1文で含める。
        - 「なぜ有効か」はメニューごとに変える。同文を繰り返さない。
        - コミュニティ一致が強いメニュー（一致2件以上、またはscore>=0.75）は、根拠行に自由記述の原文短文を1つ引用する。
        - 出力は 350〜850文字程度。読みやすいプレーンテキストで書く。
        - 見出しは次に固定する:
          1) 今週のテーマ
          2) テーマに関しての現状
          3) 今週のおすすめメニュー
        - 3) の各項目は3行構成に固定する:
          1行目: メニュー名（時間は書かない）
          2行目: やり方: ... / なぜ有効か: ...（同一メニュー統合時は「やり方A（目的）/やり方B（目的）」可）
          3行目: 根拠: 個人ログ / コミュニティ / Web / 両方（コミュニティ強一致なら次行に `コミュニティ原文: 「...」` を追記。Webを含む場合は `サイト: <サイト名>` を可能な範囲で併記）
        - Markdown記法は使わない。
        #{explicit_theme_rule}

        #{goal_line}
      SYS
    end

    def build_user_text(logs, collective_effects, collective_used:, monthly_logs:, measurement_evidence:, selected_range_days:, detail_window_days:, explicit_theme:, goal_tag_context:, community_menu_counts:, top_menu_count:, web_intensity:, web_evidence:, community_enabled:, diagnosis_context:, community_matches:, personal_menu_evidence:, candidate_plan:)
      from = (@include_today ? (@date - (detail_window_days - 1)) : (@date - detail_window_days)).iso8601
      to = (@include_today ? @date : (@date - 1)).iso8601

      lines = []
      lines << "対象日: #{@date.iso8601}"
      lines << "ユーザー呼称: #{user_call_name}"
      lines << "参照期間(選択): 直近#{selected_range_days}日"
      detail_range_label = @include_today ? "当日を含む直近#{detail_window_days}日" : "今日を除く直近#{detail_window_days}日"
      lines << "詳細ログ（日次）: #{from}〜#{to}（#{detail_range_label}）"
      lines << "傾向ログ（月次）: 利用しない"
      lines << "コミュニティ参照モード: #{community_enabled ? 'テーマ一致あり（ON）' : 'テーマ一致なし（OFF）'}"
      lines << "ユーザー指定の今週テーマ(固定): #{explicit_theme.presence || '(未指定)'}"
      lines << "目標タグ（ユーザー事実）: #{Array(goal_tag_context[:labels]).join(' / ').presence || '(未設定)'}"
      lines << "コミュニティ件数判定: 目標タグ × 同一メニュー(canonical_key) / 最大#{top_menu_count}件"
      lines << "Web参照: 常時ON（強度: #{web_intensity_label(web_intensity)}）"
      lines << ""

      lines << "診断レイヤー（現状/次の狙いを作る材料）:"
      lines << diagnosis_context.presence || "(診断情報なし)"

      lines << ""
      lines << "練習ログ:"
      if logs.empty?
        lines << "・(なし)"
      else
        logs.each do |log|
          menu_names =
            if log.respond_to?(:training_menus)
              log.training_menus.map { |m| m.name.to_s }
            else
              []
            end

          lines << "・日付: #{log.practiced_on.iso8601}"
          lines << "  練習時間(分): #{log.duration_min || 0}"
          lines << "  実施メニュー: #{menu_names.any? ? menu_names.join(' | ') : '(なし)'}"
          short = log.notes.to_s.gsub(/\s+/, " ").slice(0, 140)
          lines << "  メモ: #{short}" if short.present?
        end
      end

      if measurement_used?(measurement_evidence)
        lines << ""
        lines << "録音測定データ（必要時参照）:"
        Array(measurement_evidence[:items]).each do |item|
          lines << "・#{item[:label]}（参照理由: #{Array(item[:reasons]).join(' / ')}）"
          Array(item[:facts]).first(3).each do |fact|
            lines << "  #{fact}"
          end
        end
      end

      lines << ""
      lines << "根拠探索レイヤー（コミュニティ一致候補）:"
      if Array(community_matches[:matched_menus]).blank?
        lines << "・(一致候補なし)"
      else
        Array(community_matches[:matched_menus]).first(6).each do |menu|
          method_text = Array(menu[:methods]).map.with_index { |m, idx| "やり方#{idx + 1}: #{m}" }.join(" / ")
          lines << "・#{menu[:menu_label]} (一致#{menu[:matched_count]}件, score=#{format('%.2f', menu[:max_score])})"
          lines << "  #{method_text}" if method_text.present?
          lines << "  理由: #{Array(menu[:reasons]).join(' / ')}" if Array(menu[:reasons]).present?
          sample = Array(menu[:comment_samples]).first
          lines << "  原文例: 「#{sample.slice(0, 80)}」" if sample.present?
        end
      end

      lines << ""
      lines << "根拠探索レイヤー（次点コミュニティ候補）:"
      if Array(community_matches[:alternate_menus]).blank?
        lines << "・(なし)"
      else
        Array(community_matches[:alternate_menus]).first(5).each do |menu|
          lines << "・#{menu[:menu_label]} (次点#{menu[:matched_count]}件)"
        end
      end

      lines << ""
      lines << "根拠探索レイヤー（個人ログの実績候補）:"
      if personal_menu_evidence.blank?
        lines << "・(なし)"
      else
        personal_menu_evidence.first(5).each do |row|
          lines << "・#{row[:menu_label]}(#{row[:count]}件) | #{Array(row[:snippets]).join(' / ')}"
        end
      end

      lines << ""
      lines << "Web補完候補:"
      if Array(web_evidence[:menu_hints]).blank?
        lines << "・(有効候補なし)"
      else
        Array(web_evidence[:menu_hints]).each do |menu|
          lines << "・#{menu[:name]} | #{menu[:reason]}"
        end
      end

      lines << ""
      lines << "Web参照URL:"
      if Array(web_evidence[:sources]).present?
        Array(web_evidence[:sources]).each do |source|
          lines << "・#{source[:title]}: #{source[:url]}"
        end
      else
        lines << "・(取得なし)"
      end

      lines << ""
      lines << "コミュニティ傾向（直近#{collective_effects[:window_days]}日 / 件数#{collective_effects[:min_count]}以上）:"
      if collective_effects[:rows].blank?
        lines << "・(十分なデータなし)"
      else
        collective_effects[:rows].first(3).each do |row|
          top = row[:top_menus].first(2).map do |m|
            menu_label = "#{m[:display_label] || m[:name]}(#{m[:count]})"
            detail = Array(m[:detail_samples]).first(1).map { |d| "「#{d}」" }.join(" / ")
            [ menu_label, detail.present? ? "自由記述例: #{detail}" : nil ].compact.join(" | ")
          end.join(" / ")
          lines << "・#{row[:tag_label]}: #{top}"
        end
      end

      lines << ""
      lines << "提案選定ルール（必須）:"
      lines << "・一致投稿が1件以上ある場合は、その一致候補を優先して採用する。"
      lines << "・一致が3件未満なら、不足分を次点コミュニティ → 個人実績 → Webの順で補完する。"
      lines << "・同一メニューが複数投稿で一致した場合は1枠に統合し、やり方A/Bで差分を書く。"

      lines << ""
      lines << "候補計画（優先して採用する候補）:"
      if candidate_plan.empty?
        lines << "・(候補なし)"
      else
        candidate_plan.each do |item|
          lines << "・#{item[:menu_label]} | source=#{item[:source]} | #{item[:detail]}"
        end
      end

      lines << ""
      lines << "出力フォーマット:"
      lines << "1) 今週のテーマ（簡潔）"
      lines << "2) テーマに関しての現状（観測事実 + 今週の狙い）"
      lines << "3) 今週のおすすめメニュー（最大3つ。各項目3行: 1行目=メニュー名（時間は書かない） / 2行目=やり方+なぜ有効か / 3行目=根拠）"
      lines.join("\n")
    end

    def build_diagnosis_context(logs:, measurement_evidence:, explicit_theme:, goal_tag_context:)
      lines = []
      lines << "- テーマ: #{explicit_theme.presence || '(未指定)'}"
      lines << "- 目標: #{@user.goal_text.to_s.presence || '(未設定)'}"
      lines << "- 改善タグ: #{Array(goal_tag_context[:labels]).join(' / ').presence || '(未設定)'}"

      recent_notes = extract_recent_notes(logs, limit: 8)
      lines << "- 直近メモ: #{recent_notes.map { |row| "#{row[:date]}: #{row[:text]}" }.join(' / ').presence || '(なし)'}"

      slot = build_diagnosis_slot(
        explicit_theme: explicit_theme,
        recent_notes: recent_notes,
        goal_tag_context: goal_tag_context
      )
      lines << "- 5スロット診断（例語は参考。同義表現で判断）:"
      lines << "  発生帯域: #{slot[:band]}"
      lines << "  課題タイプ: #{slot[:challenge]}"
      lines << "  成功条件: #{slot[:success]}"
      lines << "  破綻条件: #{slot[:breakdown]}"
      lines << "  今回の狙い: #{slot[:focus]}"

      if measurement_used?(measurement_evidence)
        item_lines = Array(measurement_evidence[:items]).first(2).map do |item|
          facts = Array(item[:facts]).first(2).join(" / ")
          "#{item[:label]}: #{facts}"
        end
        lines << "- 測定要点: #{item_lines.join(' / ').presence || '(なし)'}"
      else
        lines << "- 測定要点: (未使用)"
      end
      lines.join("\n")
    end

    def build_community_matches(community_enabled:, goal_tag_keys:, explicit_theme:, diagnosis_context:)
      return { matched_menus: [], alternate_menus: [] } unless community_enabled
      return { matched_menus: [], alternate_menus: [] } if goal_tag_keys.blank?

      pool = Ai::RecommendationCommunityPostPool.fetch(goal_tag_keys: goal_tag_keys, window_days: 90, limit: 120)
      return { matched_menus: [], alternate_menus: [] } if pool.empty?

      match_result = Ai::RecommendationCommunityMatcher.match(
        user: @user,
        explicit_theme: explicit_theme,
        goal_text: @user.goal_text,
        diagnosis_context: diagnosis_context,
        candidates: pool,
        client: @client
      )

      alternate_ranked = Array(match_result[:alternates]).map.with_index do |candidate, idx|
        {
          id: candidate[:id],
          score: [ 0.5 - (idx * 0.01), 0.0 ].max,
          reason: "次点候補",
          candidate: candidate
        }
      end

      {
        matched_menus: Ai::RecommendationMenuConsolidator.consolidate(match_result[:matched]),
        alternate_menus: Ai::RecommendationMenuConsolidator.consolidate(alternate_ranked)
      }
    rescue => e
      Rails.logger.warn("[AI][RecommendationGenerator] community_match_error #{e.class}: #{e.message}")
      { matched_menus: [], alternate_menus: [] }
    end

    def build_candidate_plan(community_enabled:, community_matches:, personal_menu_evidence:, web_evidence:)
      plan = []
      seen = {}

      if community_enabled
        Array(community_matches[:matched_menus]).each do |menu|
          next if seen[menu[:canonical_key]]
          break if plan.size >= 3

          method_text = Array(menu[:methods]).first(2).map.with_index { |v, idx| "やり方#{idx + 1}=#{v}" }.join(" / ")
          reason_text = Array(menu[:reasons]).first(1).join(" / ")
          quote = Array(menu[:comment_samples]).first.to_s
          detail_segments = [ "一致#{menu[:matched_count]}件" ]
          detail_segments << method_text if method_text.present?
          detail_segments << "理由=#{reason_text}" if reason_text.present?
          detail_segments << "原文=#{quote.slice(0, 60)}" if quote.present?
          plan << {
            canonical_key: menu[:canonical_key],
            menu_label: menu[:menu_label],
            source: "community_match",
            detail: detail_segments.join(" | ")
          }
          seen[menu[:canonical_key]] = true
        end

        if plan.size < 3
          Array(community_matches[:alternate_menus]).each do |menu|
            next if seen[menu[:canonical_key]]
            break if plan.size >= 3

            method_text = Array(menu[:methods]).first(1).map.with_index { |v, idx| "やり方#{idx + 1}=#{v}" }.join(" / ")
            detail_segments = [ "次点#{menu[:matched_count]}件" ]
            detail_segments << method_text if method_text.present?
            plan << {
              canonical_key: menu[:canonical_key],
              menu_label: menu[:menu_label],
              source: "community_alternate",
              detail: detail_segments.join(" | ")
            }
            seen[menu[:canonical_key]] = true
          end
        end

        if plan.size < 3
          Array(personal_menu_evidence).each do |menu|
            next if seen[menu[:canonical_key]]
            break if plan.size >= 3

            plan << {
              canonical_key: menu[:canonical_key],
              menu_label: menu[:menu_label],
              source: "personal_log",
              detail: "個人実績#{menu[:count]}件 | #{Array(menu[:snippets]).join(' / ')}"
            }
            seen[menu[:canonical_key]] = true
          end
        end
      end

      if plan.size < 3
        Array(web_evidence[:menu_hints]).each_with_index do |menu, idx|
          break if plan.size >= 3

          key = "web:#{menu[:name]}:#{idx}"
          next if seen[key]

          plan << {
            canonical_key: key,
            menu_label: menu[:name].to_s,
            source: "web",
            detail: menu[:reason].to_s.slice(0, 80)
          }
          seen[key] = true
        end
      end

      plan
    end

    def collective_knowledge_used?(collective_effects)
      collective_effects[:rows].present?
    end

    def measurement_used?(measurement_evidence)
      return false unless measurement_evidence.is_a?(Hash)

      Array(measurement_evidence[:items]).any?
    end

    def user_custom_instructions
      return "" unless @user.respond_to?(:ai_custom_instructions)

      @user.ai_custom_instructions.to_s.strip
    end

    def user_improvement_tags
      return [] unless @user.respond_to?(:ai_improvement_tags)

      Array(@user.ai_improvement_tags)
        .map(&:to_s)
        .map(&:strip)
        .reject(&:blank?)
        .uniq
        .select { |tag| ImprovementTagCatalog::TAGS.include?(tag) }
    end

    def monthly_trend_label(selected_range_days)
      case selected_range_days
      when 30
        "直近1か月の月ログ"
      when 90
        "直近3か月の月ログ"
      else
        "利用なし（14日モード）"
      end
    end

    def user_call_name
      Ai::UserCallName.resolve(@user)
    end

    def web_intensity_label(intensity)
      intensity.to_sym == :high ? "high" : "light"
    end

    def finalize_recommendation_text(text, web_evidence:, community_menu_counts:, community_enabled:, community_quotes:, community_match_counts:, diagnosis_context: nil, explicit_theme: nil)
      normalized_text = normalize_section_titles(text.to_s)
      lines = sanitize_output_lines(normalized_text)
      return text if lines.empty?

      ensure_theme_focus_in_state!(lines, explicit_theme: explicit_theme)
      prune_state_offtopic_sentences!(lines, explicit_theme: explicit_theme)

      source_labels = build_web_source_labels(web_evidence).first(2)
      web_available = source_labels.any?
      web_used = web_evidence[:used] == true

      menu_range = menu_section_range(lines)
      return text if menu_range.nil?

      site_suffix = source_labels.any? ? "サイト: #{source_labels.join(' / ')}" : nil
      menu_entries = extract_menu_entries(lines, menu_range)
      menu_entries.reverse_each do |entry|
        canonical_key = canonical_key_for_menu_name(entry[:name])
        community_match_count = community_match_counts[canonical_key].to_i
        quote = community_quotes[canonical_key].to_s

        if entry[:desc_start_idx] && entry[:desc_end_idx]
          desc_start = entry[:desc_start_idx]
          desc_end = entry[:desc_end_idx]
          original_detail = lines[desc_start..desc_end].map { |v| v.to_s.strip }.reject(&:blank?).join(" / ")
          lines[desc_start..desc_end] = [ normalize_menu_detail_line(original_detail, menu_name: entry[:name]) ]
          removed_count = desc_end - desc_start
          entry[:desc_idx] = desc_start
          if entry[:evidence_idx]
            entry[:evidence_idx] -= removed_count
          end
        else
          insert_at = entry[:header_idx] + 1
          lines.insert(insert_at, default_menu_detail_line(menu_name: entry[:name]))
          entry[:desc_idx] = insert_at
          if entry[:evidence_idx]
            entry[:evidence_idx] += 1
          end
        end

        replacement =
          if !community_enabled
            if web_used
              site_suffix.present? ? "根拠: Web（#{site_suffix}）" : "根拠: Web"
            else
              "根拠: 個人ログ"
            end
          elsif community_match_count > 0
            if web_used
              if site_suffix.present?
                "根拠: 両方（コミュニティ#{community_match_count}件 + Web、#{site_suffix}）"
              else
                "根拠: 両方（コミュニティ#{community_match_count}件 + Web）"
              end
            else
              "根拠: コミュニティ#{community_match_count}件"
            end
          else
            if web_used
              site_suffix.present? ? "根拠: Web（#{site_suffix}）" : "根拠: Web"
            else
              "根拠: 個人ログ"
            end
          end

        if entry[:evidence_idx].nil?
          insert_at = entry[:desc_idx] + 1
          lines.insert(insert_at, replacement)
          entry[:evidence_idx] = insert_at
        else
          lines[entry[:evidence_idx]] = merge_evidence_line(lines[entry[:evidence_idx]], replacement)
        end

        if entry[:evidence_idx] && quote.present?
          current = lines[entry[:evidence_idx]].to_s
          if current.include?("コミュニティ") || current.include?("両方")
            lines[entry[:evidence_idx]] = merge_quote_to_evidence(current, quote)
          end
        end

        if entry[:evidence_idx]
          lines[entry[:evidence_idx]] = ensure_evidence_consistency_with_quote(lines[entry[:evidence_idx]])
          ensure_web_source_line!(
            lines,
            evidence_idx: entry[:evidence_idx],
            source_labels: source_labels
          )
        end
      end

      apply_unique_effect_reasons!(lines, menu_entries)
      enforce_core_section_layout!(lines)
      normalize_evidence_with_following_quote!(lines)

      lines.join("\n")
    end

    def build_web_source_labels(web_evidence)
      Array(web_evidence[:sources]).filter_map do |source|
        next unless source.is_a?(Hash)
        title = source[:title].to_s.strip.presence || source["title"].to_s.strip.presence
        next title if title.present?

        url = source[:url].to_s.strip.presence || source["url"].to_s.strip.presence
        next if url.blank?

        begin
          URI.parse(url).host.to_s.sub(/\Awww\./, "").presence
        rescue
          nil
        end
      end.uniq
    end

    def ensure_web_source_line!(lines, evidence_idx:, source_labels:)
      return if source_labels.blank?

      evidence_line = lines[evidence_idx].to_s
      return unless evidence_line.include?("Web") || evidence_line.include?("両方")

      line_text = "Web出典: #{source_labels.join(' / ')}"
      next_idx = evidence_idx + 1
      if next_idx < lines.length && lines[next_idx].to_s.strip.start_with?("Web出典:")
        lines[next_idx] = line_text
      else
        lines.insert(next_idx, line_text)
      end
    end

    def build_community_quotes_by_menu(community_matches)
      Array(community_matches[:matched_menus]).each_with_object({}) do |menu, memo|
        next unless menu.is_a?(Hash)
        canonical_key = menu[:canonical_key].to_s
        next if canonical_key.blank?
        matched_count = menu[:matched_count].to_i
        max_score = menu[:max_score].to_f
        next unless matched_count >= 2 || max_score >= 0.75

        sample = Array(menu[:comment_samples]).find { |v| v.to_s.strip.present? }
        next if sample.blank?

        memo[canonical_key] = sample.to_s.gsub(/\s+/, " ").strip.slice(0, 300)
      end
    end

    def build_community_match_counts_by_menu(community_matches)
      Array(community_matches[:matched_menus]).each_with_object({}) do |menu, memo|
        next unless menu.is_a?(Hash)
        key = menu[:canonical_key].to_s
        next if key.blank?
        memo[key] = menu[:matched_count].to_i
      end
    end

    def merge_evidence_line(current_line, replacement_line)
      current = current_line.to_s.strip
      replacement = replacement_line.to_s.strip
      return replacement if current.blank?
      return replacement unless current.start_with?("根拠:")

      replacement
    end

    def merge_quote_to_evidence(evidence_line, quote)
      line = evidence_line.to_s.strip
      short_quote = quote.to_s.gsub(/\s+/, " ").strip.slice(0, 80)
      return line if short_quote.blank?
      return line if line.include?("\nコミュニティ原文:")

      "#{line}\nコミュニティ原文: 「#{short_quote}」"
    end

    def ensure_evidence_consistency_with_quote(evidence_line)
      line = evidence_line.to_s
      return line unless line.include?("コミュニティ原文:")

      head, *tail = line.split("\n")
      return line unless head.to_s.start_with?("根拠:")
      return line if head.include?("コミュニティ") || head.include?("両方")

      fixed_head =
        begin
          web_match = head.match(/\A根拠:\s*Web(?:（(.+)）)?\z/)
          if web_match
            site = web_match[1].to_s.strip
            site.present? ? "根拠: 両方（コミュニティ + Web、#{site}）" : "根拠: 両方（コミュニティ + Web）"
          else
            "根拠: コミュニティ"
          end
        end

      ([ fixed_head ] + tail).join("\n")
    end

    def normalize_section_titles(text)
      lines = text.to_s.gsub(/\r\n?/, "\n").split("\n")
      return text if lines.empty?

      lines.map do |line|
        stripped = line.to_s.strip
        normalized = stripped.sub(/\A#+\s*/, "")
        if normalized.match?(/\A1\)\s*(今週の方針|今日の方針)\b/)
          "1) 今週のテーマ"
        elsif normalized.match?(/\A2\)\s*今の状態\b/)
          "2) テーマに関しての現状"
        elsif normalized.match?(/\A3\)\s*(おすすめメニュー|今週のおすすめメニュー)\b/)
          "3) 今週のおすすめメニュー"
        else
          line
        end
      end.join("\n")
    end

    def sanitize_output_lines(text)
      text.to_s.gsub(/\r\n?/, "\n").split("\n").map do |line|
        v = line.to_s.gsub(/\A\s*#{Regexp.escape("###")}\s*/, "")
        v = v.gsub(/\A\s*##\s*/, "")
        v = v.gsub(/\A\s*#\s*/, "")
        v = v.gsub(/\*\*(.*?)\*\*/, '\1')
        v = v.gsub("**", "")
        v = v.gsub(/\A\s*\d+\.\s+/, "")
        v = v.gsub(/\A\s*[*-]+\s*/, "")
        v = v.gsub(/\A\s*•\s*/, "")
        v = v.gsub(/\A\s*・\s*/, "")
        v = v.gsub(/\A\s*[\/／]\s*(?=(やり方:|なぜ有効か:|失敗時:))/, "")
        v = v.gsub(/\A\s*⭐️\s*/, "")
        v = v.gsub(/\A\s*⭐\s*/, "")
        v = v.gsub(/\A\s*🌟\s*/, "")
        v.rstrip
      end
    end

    def evidence_line_has_web?(line)
      normalized = line.to_s
      normalized.include?("Web") || normalized.include?("web") || normalized.include?("両方")
    end

    def menu_section_range(lines)
      start_idx = lines.find_index { |line| line.to_s.strip.match?(/\A3\)\s*/) }
      if start_idx.nil?
        first_menu_idx = first_menu_like_index(lines)
        return nil if first_menu_idx.nil?

        return first_menu_idx..(lines.length - 1)
      end

      next_idx = lines.each_index.find { |idx| idx > start_idx && lines[idx].to_s.strip.match?(/\A\d\)\s*/) }
      end_idx = next_idx.nil? ? lines.length - 1 : next_idx - 1
      return nil if end_idx < start_idx

      start_idx..end_idx
    end

    def extract_menu_entries(lines, menu_range)
      entries = []
      idx = menu_range.begin
      while idx <= menu_range.end
        line = lines[idx].to_s.strip
        next_line = (idx + 1 <= menu_range.end) ? lines[idx + 1].to_s.strip : nil
        if line.include?("｜")
          scan_end = next_menu_header_index(lines, menu_range, idx + 1)&.-(1) || menu_range.end
          desc_start_idx = nil
          desc_end_idx = nil
          evidence_idx = nil
          probe = idx + 1
          while probe <= scan_end
            current = lines[probe].to_s.strip
            if current.start_with?("根拠:")
              evidence_idx = probe
              break
            elsif current.start_with?("コミュニティ原文:")
              # 原文行が先に来た場合は本文として扱う
              desc_start_idx ||= probe
              desc_end_idx = probe
            elsif current.present?
              desc_start_idx ||= probe
              desc_end_idx = probe
            end
            probe += 1
          end
          entries << {
            name: line.split("｜", 2).first.to_s.strip,
            header_idx: idx,
            desc_start_idx: desc_start_idx,
            desc_end_idx: desc_end_idx,
            evidence_idx: evidence_idx,
            body_end_idx: scan_end
          }
          idx = scan_end + 1
        elsif (idx + 1) <= menu_range.end && duration_line?(lines[idx + 1])
          lines[idx] = "#{line}｜#{lines[idx + 1].to_s.strip}"
          lines.delete_at(idx + 1)
          menu_range = (menu_range.begin..(menu_range.end - 1))
          scan_end = next_menu_header_index(lines, menu_range, idx + 1)&.-(1) || menu_range.end
          desc_start_idx = nil
          desc_end_idx = nil
          evidence_idx = nil
          probe = idx + 1
          while probe <= scan_end
            current = lines[probe].to_s.strip
            if current.start_with?("根拠:")
              evidence_idx = probe
              break
            elsif current.start_with?("コミュニティ原文:")
              desc_start_idx ||= probe
              desc_end_idx = probe
            elsif current.present?
              desc_start_idx ||= probe
              desc_end_idx = probe
            end
            probe += 1
          end
          entries << {
            name: line,
            header_idx: idx,
            desc_start_idx: desc_start_idx,
            desc_end_idx: desc_end_idx,
            evidence_idx: evidence_idx,
            body_end_idx: scan_end
          }
          idx = scan_end + 1
        elsif header_candidate_line?(line, next_line)
          scan_end = next_menu_header_index(lines, menu_range, idx + 1)&.-(1) || menu_range.end
          desc_start_idx = nil
          desc_end_idx = nil
          evidence_idx = nil
          probe = idx + 1
          while probe <= scan_end
            current = lines[probe].to_s.strip
            if current.start_with?("根拠:")
              evidence_idx = probe
              break
            elsif current.start_with?("コミュニティ原文:")
              desc_start_idx ||= probe
              desc_end_idx = probe
            elsif current.present?
              desc_start_idx ||= probe
              desc_end_idx = probe
            end
            probe += 1
          end
          entries << {
            name: line,
            header_idx: idx,
            desc_start_idx: desc_start_idx,
            desc_end_idx: desc_end_idx,
            evidence_idx: evidence_idx,
            body_end_idx: scan_end
          }
          idx = scan_end + 1
        else
          idx += 1
        end
      end
      entries
    end

    def next_menu_header_index(lines, menu_range, from_idx)
      idx = from_idx
      while idx <= menu_range.end
        line = lines[idx].to_s.strip
        next_line = (idx + 1 <= menu_range.end) ? lines[idx + 1].to_s.strip : nil
        return idx if line.include?("｜")
        return idx if (idx + 1) <= menu_range.end && duration_line?(lines[idx + 1])
        return idx if header_candidate_line?(line, next_line)
        idx += 1
      end
      nil
    end

    def first_menu_like_index(lines)
      lines.each_index.find do |idx|
        line = lines[idx].to_s.strip
        next false if line.blank?
        next false if line.match?(/\A\d\)\s/)
        next false if line.start_with?("やり方:", "なぜ有効か:", "失敗時:", "根拠:", "コミュニティ原文:")

        line.include?("｜") ||
          ((idx + 1) < lines.length && duration_line?(lines[idx + 1])) ||
          header_candidate_line?(line, lines[idx + 1].to_s.strip)
      end
    end

    def header_candidate_line?(line, next_line)
      raw = line.to_s.strip
      nxt = next_line.to_s.strip
      return false if raw.blank?
      return false if raw.match?(/\A\d\)\s/)
      return false if raw.start_with?("やり方:", "なぜ有効か:", "失敗時:", "根拠:", "コミュニティ原文:")
      return false if raw.include?("：") || raw.include?(":")

      nxt.start_with?("やり方:", "なぜ有効か:", "失敗時:", "根拠:")
    end

    def duration_line?(line)
      line.to_s.strip.match?(/\A\d+\s*(分|min|mins|minutes)\z/i)
    end

    def normalize_menu_detail_line(line, menu_name:)
      raw = line.to_s.strip
      return default_menu_detail_line(menu_name: menu_name) if raw.blank?

      normalized = raw.gsub(/\A\s*[*-]+\s*/, "")
      normalized = "やり方: #{normalized}" unless normalized.include?("やり方:")
      normalized += " / なぜ有効か: #{default_effect_reason_for(menu_name)}" unless normalized.include?("なぜ有効か:")
      normalized += " / 失敗時: 詰まりや力みが出たら半音下げて再開" unless normalized.match?(/(失敗時|詰ま|力み|修正)/)
      multiline_menu_detail_line(normalized)
    end

    def apply_unique_effect_reasons!(lines, menu_entries)
      seen = {}
      Array(menu_entries).each do |entry|
        idx = entry[:desc_idx]
        next if idx.nil?

        detail_line = lines[idx].to_s
        reason = extract_effect_reason(detail_line)
        next if reason.blank?

        normalized_reason_key = reason.gsub(/\s+/, " ").strip
        next if normalized_reason_key.blank?
        unless seen[normalized_reason_key]
          seen[normalized_reason_key] = true
          next
        end

        replacement = default_effect_reason_for(entry[:name])
        lines[idx] = replace_effect_reason(detail_line, replacement)
      end
    end

    def ensure_theme_focus_in_state!(lines, explicit_theme:)
      theme = explicit_theme.to_s.strip
      return if theme.blank?

      state_start = lines.find_index { |line| line.to_s.strip.match?(/\A2\)\s*/) }
      return if state_start.nil?

      next_section_idx = lines.each_index.find { |idx| idx > state_start && lines[idx].to_s.strip.match?(/\A3\)\s*/) }
      state_end = next_section_idx ? next_section_idx - 1 : lines.length - 1
      return if state_end < state_start

      anchor = "今週テーマ「#{theme}」に対して、現在の状態と今週の狙いを整理します。"
      first_body_idx = ((state_start + 1)..state_end).find { |idx| lines[idx].to_s.strip.present? }
      if first_body_idx.nil?
        lines.insert(state_start + 1, anchor)
        return
      end

      first_line = lines[first_body_idx].to_s
      return if first_line.include?(theme)

      lines.insert(first_body_idx, anchor)
    end

    def enforce_core_section_layout!(lines)
      section1_idx = lines.find_index { |line| line.to_s.strip.match?(/\A1\)\s*/) }
      return if section1_idx.nil?

      lines.shift(section1_idx) if section1_idx.positive?

      section3_idx = lines.find_index { |line| line.to_s.strip.match?(/\A3\)\s*/) }
      return if section3_idx.nil?

      menu_range = menu_section_range(lines)
      return if menu_range.nil?

      entries = extract_menu_entries(lines, menu_range)
      return if entries.empty?

      rebuilt_menu_lines = [ lines[section3_idx] ]
      entries.each do |entry|
        header = entry[:name].to_s.strip
        rebuilt_menu_lines << header if header.present?

        if entry[:desc_start_idx] && entry[:desc_end_idx]
          rebuilt_menu_lines.concat(
            lines[entry[:desc_start_idx]..entry[:desc_end_idx]].map(&:to_s).reject(&:blank?)
          )
        end

        if entry[:evidence_idx]
          rebuilt_menu_lines << lines[entry[:evidence_idx]].to_s
          meta_idx = entry[:evidence_idx] + 1
          while meta_idx <= menu_range.end
            meta_line = lines[meta_idx].to_s.strip
            break unless meta_line.start_with?("Web出典:") || meta_line.start_with?("コミュニティ原文:")

            rebuilt_menu_lines << lines[meta_idx].to_s
            meta_idx += 1
          end
        end
      end

      start_idx = section3_idx
      end_idx = menu_range.end
      lines[start_idx..end_idx] = rebuilt_menu_lines
    end

    def extract_effect_reason(detail_line)
      detail_line.to_s[/なぜ有効か:\s*([^\n]+)/, 1].to_s.strip
    end

    def replace_effect_reason(detail_line, replacement_reason)
      text = detail_line.to_s
      return text if replacement_reason.to_s.strip.blank?

      if text.match?(/なぜ有効か:\s*[^\n]+/)
        text.sub(/なぜ有効か:\s*[^\n]+/, "なぜ有効か: #{replacement_reason}")
      else
        "#{text}\nなぜ有効か: #{replacement_reason}"
      end
    end

    def default_menu_detail_line(menu_name:)
      multiline_menu_detail_line("やり方: 目安音域で低→高→低を往復してつなぎを確認 / なぜ有効か: #{default_effect_reason_for(menu_name)} / 失敗時: 詰まりや力みが出たら半音下げて再開")
    end

    def default_effect_reason_for(menu_name)
      name = menu_name.to_s
      return "唇の脱力で喉周辺の過緊張を下げ、換声点の切替を滑らかにしやすい。" if name.include?("リップロール")
      return "共鳴位置を保ちやすく、地声/裏声の橋渡しで声の段差を減らしやすい。" if name.include?("ハミング")
      return "子音アタックで声帯閉鎖の感覚を揃え、換声点付近の息漏れを抑えやすい。" if name.match?(/地声|Nay|Mum/i)

      "換声点付近のつながりを安定させるため。"
    end

    def multiline_menu_detail_line(line)
      normalized = line.to_s.strip
      normalized = normalized.gsub(%r{\n\s*[\/／]\s*(?=(やり方:|なぜ有効か:|失敗時:))}, "\n")
      normalized = normalized.gsub(%r{\A\s*[\/／]\s*(?=(やり方:|なぜ有効か:|失敗時:))}, "")
      normalized = normalized.gsub(/\s+(?=(なぜ有効か:|失敗時:))/, " / ")
      parts = normalized.split(/\s+\/\s+/).map(&:strip).reject(&:blank?)
      ordered = []
      ordered << parts.find { |p| p.start_with?("やり方:") }
      ordered << parts.find { |p| p.start_with?("なぜ有効か:") }
      ordered << parts.find { |p| p.start_with?("失敗時:") }
      extras = parts.reject do |p|
        p.start_with?("やり方:") || p.start_with?("なぜ有効か:") || p.start_with?("失敗時:")
      end
      (ordered.compact + extras).join("\n")
    end

    def normalize_evidence_with_following_quote!(lines)
      idx = 0
      while idx < lines.length
        line = lines[idx].to_s.strip
        if line.start_with?("根拠:")
          next_idx = idx + 1
          while next_idx < lines.length && lines[next_idx].to_s.strip.start_with?("Web出典:")
            next_idx += 1
          end
          quote_line = lines[next_idx].to_s.strip
          if quote_line.start_with?("コミュニティ原文:") && !line.include?("コミュニティ") && !line.include?("両方")
            web_match = line.match(/\A根拠:\s*Web(?:（(.+)）)?\z/)
            if web_match
              site = web_match[1].to_s.strip
              lines[idx] = site.present? ? "根拠: 両方（コミュニティ + Web、#{site}）" : "根拠: 両方（コミュニティ + Web）"
            else
              lines[idx] = "根拠: コミュニティ"
            end
          end
        end
        idx += 1
      end
    end

    def prune_state_offtopic_sentences!(lines, explicit_theme:)
      theme = explicit_theme.to_s
      return if theme.blank?

      state_start = lines.find_index { |line| line.to_s.strip.match?(/\A2\)\s*/) }
      return if state_start.nil?

      next_section_idx = lines.each_index.find { |idx| idx > state_start && lines[idx].to_s.strip.match?(/\A3\)\s*/) }
      state_end = next_section_idx ? next_section_idx - 1 : lines.length - 1
      return if state_end < state_start

      return if theme.match?(/音程|ロングトーン|音量|dB|Hz|半音|測定/)

      off_topic_re = /(ロングトーン|音程|音量|dB|Hz|半音|測定)/
      ((state_start + 1)..state_end).each do |idx|
        raw = lines[idx].to_s.strip
        next if raw.blank?
        next if raw.start_with?("今週テーマ「")

        kept = raw
          .split(/(?<=。|！|!|？|\?)/)
          .map(&:strip)
          .reject(&:blank?)
          .reject { |sentence| sentence.match?(off_topic_re) }

        lines[idx] = kept.join(" ").strip
      end

      # 余白化した行を除去
      pruned = lines[(state_start + 1)..state_end].reject { |line| line.to_s.strip.blank? }
      lines[(state_start + 1)..state_end] = pruned
    end

    def canonical_key_for_menu_name(menu_name)
      result = MenuCanonicalization::RuleEngine.classify(name: menu_name.to_s)
      result&.canonical_key.to_s.presence || "unknown|unspecified"
    rescue
      "unknown|unspecified"
    end

    def build_diagnosis_slot(explicit_theme:, recent_notes:, goal_tag_context:)
      ai_slot = build_diagnosis_slot_by_ai(
        explicit_theme: explicit_theme,
        recent_notes: recent_notes,
        goal_tag_context: goal_tag_context
      )
      return ai_slot if ai_slot.present?

      build_diagnosis_slot_fallback(
        explicit_theme: explicit_theme,
        recent_notes: recent_notes,
        goal_tag_context: goal_tag_context
      )
    end

    def build_diagnosis_slot_by_ai(explicit_theme:, recent_notes:, goal_tag_context:)
      return nil unless @client.respond_to?(:generate_text_with_usage!)

      result = @client.generate_text_with_usage!(
        system_text: diagnosis_slot_system_text,
        user_text: diagnosis_slot_user_text(
          explicit_theme: explicit_theme,
          recent_notes: recent_notes,
          goal_tag_context: goal_tag_context
        ),
        max_output_tokens: 900,
        temperature: 0.2,
        user: @user,
        feature: "recommendation_diagnosis_slot",
        web_search: false
      )

      parse_diagnosis_slot_json(result[:text])
    rescue => e
      Rails.logger.warn("[AI][RecommendationGenerator] diagnosis_slot_ai_error #{e.class}: #{e.message}")
      nil
    end

    def diagnosis_slot_system_text
      <<~SYS
        あなたはボイストレーニングの診断アシスタントです。
        入力文から「現在の声の状況」を5スロットで要約し、JSONのみ返してください。

        出力JSON形式:
        {
          "band": "発生帯域",
          "challenge": "課題タイプ（失敗症状 or 改善ターゲット）",
          "success": "成功条件",
          "breakdown": "破綻条件",
          "focus": "今回の狙い"
        }

        ルール:
        - 5項目は必須。空欄禁止。
        - 課題タイプは、テーマ文から読み取れる場合は最優先で採用する。
          例: 「〜を解決/減らす」→ 失敗症状, 「〜を強くする/上げる/伸ばす」→ 改善ターゲット。
        - テーマから読み取れない場合のみ、直近ログの観測事実を使って課題タイプを作る。
        - 成功条件/破綻条件はテーマと直接関係する観測だけを書く。テーマ外の測定傾向（例: 音程安定やロングトーン）を混ぜない。
        - 例語（詰まり/力み/息漏れ、つながる/安定/抜ける等）は参考。語を固定せず同義表現で判断する。
        - 音高は近傍一致を許容。例: F#4付近なら±2半音も同帯域として扱う。
        - 推測は最小限にし、入力根拠に基づいて書く。
      SYS
    end

    def diagnosis_slot_user_text(explicit_theme:, recent_notes:, goal_tag_context:)
      lines = []
      lines << "テーマ: #{explicit_theme.presence || '(未指定)'}"
      lines << "目標: #{@user.goal_text.to_s.presence || '(未設定)'}"
      lines << "改善タグ: #{Array(goal_tag_context[:labels]).join(' / ').presence || '(未設定)'}"
      lines << "直近メモ:"
      if recent_notes.blank?
        lines << "・(なし)"
      else
        recent_notes.each { |row| lines << "・#{row[:date]}: #{row[:text]}" }
      end
      lines.join("\n")
    end

    def parse_diagnosis_slot_json(text)
      raw = text.to_s
      start_idx = raw.index("{")
      end_idx = raw.rindex("}")
      return nil if start_idx.nil? || end_idx.nil? || end_idx <= start_idx

      parsed = JSON.parse(raw[start_idx..end_idx])
      slot = {
        band: parsed["band"].to_s.strip,
        challenge: parsed["challenge"].to_s.strip,
        success: parsed["success"].to_s.strip,
        breakdown: parsed["breakdown"].to_s.strip,
        focus: parsed["focus"].to_s.strip
      }
      return nil if slot.values.any?(&:blank?)

      slot
    rescue JSON::ParserError
      nil
    end

    def build_diagnosis_slot_fallback(explicit_theme:, recent_notes:, goal_tag_context:)
      combined_text = [ explicit_theme.to_s, @user.goal_text.to_s, recent_notes.map { |row| row[:text] }.join(" / ") ].join(" / ")
      band =
        if (range = extract_pitch_range(explicit_theme.to_s) || extract_pitch_range(combined_text))
          start_note = range[:start]
          end_note = range[:end]
          expanded_start = shift_note(start_note, -2) || start_note
          expanded_end = shift_note(end_note, 2) || end_note
          "#{start_note}〜#{end_note}（近傍: #{expanded_start}〜#{expanded_end}）"
        elsif (single_note = extract_primary_pitch_note(explicit_theme.to_s) || extract_primary_pitch_note(combined_text))
          nearby = nearby_notes(single_note, semitone_range: 2)
          "#{single_note}付近（近傍: #{nearby.join(' / ')}）"
        elsif explicit_theme.to_s.include?("換声点")
          "換声点付近（具体音はログ記述から推定）"
        else
          "テーマ周辺の中高音域（ログ記述から推定）"
        end

      challenge = detect_challenge_type(explicit_theme: explicit_theme, recent_notes: recent_notes)
      success = extract_condition_snippets(recent_notes, positive: true, explicit_theme: explicit_theme)
      breakdown = extract_condition_snippets(recent_notes, positive: false, explicit_theme: explicit_theme)
      focus = build_focus_line(explicit_theme: explicit_theme, challenge: challenge, goal_labels: Array(goal_tag_context[:labels]))

      {
        band: band,
        challenge: challenge,
        success: success,
        breakdown: breakdown,
        focus: focus
      }
    end

    def extract_recent_notes(logs, limit:)
      Array(logs).last(limit).filter_map do |log|
        note = log.notes.to_s.gsub(/\s+/, " ").strip
        next if note.blank?

        { date: log.practiced_on&.iso8601 || "日付不明", text: note.slice(0, 120) }
      end
    end

    def detect_challenge_type(explicit_theme:, recent_notes:)
      theme = explicit_theme.to_s.gsub(/\s+/, " ").strip
      if theme.present?
        return "失敗症状: #{theme_to_failure_phrase(theme)}" if theme_failure_intent?(theme)
        return "改善ターゲット: #{theme}" if theme_target_intent?(theme)
      end

      failure = detect_failure_symptoms(recent_notes)
      "失敗症状: #{failure}"
    end

    def theme_failure_intent?(theme)
      theme.match?(/(改善|解決|減ら|なく|直す|抑え|防ぐ)/)
    end

    def theme_target_intent?(theme)
      theme.match?(/(強く|上げ|伸ば|高め|安定|広げ|深め|出しやす|きれい|滑らか|スムーズ)/)
    end

    def theme_to_failure_phrase(theme)
      cleaned = theme.dup
      cleaned = cleaned.sub(/(を)?(改善|解決|減らす?|なくす?|直す|抑える|防ぐ)\z/, "")
      cleaned = cleaned.sub(/(を)?(きれいにする|滑らかにする|スムーズにする)\z/, "")
      cleaned = cleaned.strip
      cleaned.present? ? cleaned : theme
    end

    def detect_failure_symptoms(recent_notes)
      text = Array(recent_notes).map { |row| row[:text] }.join(" / ")
      symptoms = []
      symptoms << "詰まり" if text.match?(/詰ま|つま|引っかか|引っ掛か/)
      symptoms << "力み" if text.match?(/力み|力む|喉.*締|喉.*詰/)
      symptoms << "息漏れ" if text.match?(/息漏れ|息が漏/)
      symptoms << "音程ブレ" if text.match?(/音程.*(不安定|ズレ|ぶれ)|ピッチ.*(不安定|ズレ|ぶれ)|音が外/)
      symptoms << "ひっくり返り" if text.match?(/ひっくり返|裏返/)
      symptoms << "かすれ" if text.match?(/かすれ|枯れ/)
      return symptoms.first(3).join(" / ") if symptoms.any?

      "ログから顕著な症状は特定途中（詰まり/力み/息漏れ等の観測を優先）"
    end

    def extract_condition_snippets(recent_notes, positive:, explicit_theme:)
      scoped_notes = theme_scoped_notes(recent_notes, explicit_theme: explicit_theme)
      scoped_notes = Array(recent_notes) if scoped_notes.empty?

      patterns =
        if positive
          /(通る|出しやす|安定|つなが|できた|出せた|楽|改善|出る)/
        else
          /(詰ま|力み|苦し|きつ|出ない|崩れ|外れ|息漏れ|不安定|ひっくり返)/
        end

      snippets = Array(scoped_notes).filter_map do |row|
        text = row[:text].to_s
        next unless text.match?(patterns)

        "#{row[:date]}: #{text.slice(0, 70)}"
      end.first(2)

      return snippets.join(" / ") if snippets.any?

      positive ? "再現できる成功条件は観測中（通る/つながる瞬間を優先記録）" : "破綻条件は観測中（上行時・音量増加時の崩れを優先確認）"
    end

    def theme_scoped_notes(recent_notes, explicit_theme:)
      theme = explicit_theme.to_s
      return Array(recent_notes) if theme.blank?

      patterns = theme_scope_patterns(theme)
      return Array(recent_notes) if patterns.empty?

      Array(recent_notes).select do |row|
        text = row[:text].to_s
        patterns.any? { |pattern| text.match?(pattern) }
      end
    end

    def theme_scope_patterns(theme)
      patterns = []
      text = theme.to_s

      patterns << /(ミドル|換声点|地声|裏声|声帯|息漏れ|力み|喉|ブリッジ|つなが)/ if text.match?(/ミドル|換声点|地声|裏声/)
      patterns << /(高音|音域|レンジ|半音|キー|D[0-8]|E[0-8]|F#?[0-8]|G#?[0-8]|A[0-8])/ if text.match?(/高音|音域/)
      patterns << /(音程|ピッチ|cents|半音ズレ)/ if text.match?(/音程|ピッチ/)
      patterns << /(ロングトーン|持続|息の長さ|sustain)/ if text.match?(/ロングトーン|持続/)
      patterns << /(音量|ボリューム|dB)/ if text.match?(/音量|ボリューム/)
      patterns << /(息切れ|ブレス|息が続)/ if text.match?(/息切れ|ブレス/)
      patterns << /(力み|喉|締ま|脱力)/ if text.match?(/力み|喉/)
      patterns << /(抜け|響き|共鳴|鼻腔)/ if text.match?(/声の抜け|響き|共鳴/)

      patterns
    end

    def build_focus_line(explicit_theme:, challenge:, goal_labels:)
      return explicit_theme.to_s if explicit_theme.to_s.present?
      return "#{goal_labels.first}に直結する1点を優先" if goal_labels.any?
      return "#{challenge.split(' / ').first}に直結する1点を優先" if challenge.present?

      "発声の再現性を上げる1点に集中"
    end

    def extract_pitch_notes(text)
      raw_notes = text.to_s.scan(/[A-G](?:#|b)?[0-8]/i).map { |note| normalize_pitch_note(note) }.compact
      raw_notes.uniq
    end

    def extract_primary_pitch_note(text)
      extract_pitch_notes(text).first
    end

    def extract_pitch_range(text)
      raw = text.to_s
      m = raw.match(/([A-G](?:#|b)?[0-8])\s*(?:~|〜|-|to)\s*([A-G](?:#|b)?[0-8])/i)
      return nil unless m

      start_note = normalize_pitch_note(m[1])
      end_note = normalize_pitch_note(m[2])
      return nil if start_note.blank? || end_note.blank?

      start_midi = note_to_midi(start_note)
      end_midi = note_to_midi(end_note)
      return nil if start_midi.nil? || end_midi.nil?

      if start_midi <= end_midi
        { start: start_note, end: end_note }
      else
        { start: end_note, end: start_note }
      end
    end

    def nearby_notes(note, semitone_range:)
      base_midi = note_to_midi(note)
      return [ note ] if base_midi.nil?

      ((base_midi - semitone_range)..(base_midi + semitone_range)).filter_map { |midi| midi_to_note(midi) }
    end

    def shift_note(note, semitone_delta)
      midi = note_to_midi(note)
      return nil if midi.nil?

      midi_to_note(midi + semitone_delta.to_i)
    end

    def normalize_pitch_note(note)
      text = note.to_s.strip
      return nil unless text.match?(/\A[A-Ga-g](?:#|b)?[0-8]\z/)

      letter = text[0].upcase
      accidental = text[1] == "b" ? "b" : (text[1] == "#" ? "#" : "")
      octave = text[-1]
      "#{letter}#{accidental}#{octave}"
    end

    def note_to_midi(note)
      normalized = normalize_pitch_note(note)
      return nil if normalized.blank?

      key = normalized[0, normalized.length - 1]
      octave = normalized[-1].to_i
      semitone_map = {
        "C" => 0, "C#" => 1, "Db" => 1, "D" => 2, "D#" => 3, "Eb" => 3,
        "E" => 4, "F" => 5, "F#" => 6, "Gb" => 6, "G" => 7, "G#" => 8,
        "Ab" => 8, "A" => 9, "A#" => 10, "Bb" => 10, "B" => 11
      }
      semitone = semitone_map[key]
      return nil if semitone.nil?

      (octave + 1) * 12 + semitone
    end

    def midi_to_note(midi)
      return nil unless midi.is_a?(Numeric)
      return nil if midi < 0

      note_names = %w[C C# D D# E F F# G G# A A# B]
      semitone = midi.to_i % 12
      octave = (midi.to_i / 12) - 1
      return nil if octave < 0 || octave > 8

      "#{note_names[semitone]}#{octave}"
    end

    def normalize_tag_keys(raw)
      Array(raw)
        .map(&:to_s)
        .map(&:strip)
        .reject(&:blank?)
        .uniq
        .select { |tag| ImprovementTagCatalog::TAGS.include?(tag) }
    end
  end
end
