# frozen_string_literal: true

module Ai
  class GeneralChatResponder
    SYSTEM_PROMPT_VERSION = "general-chat-v2"
    USER_PROMPT_VERSION = "general-chat-v2"
    MAX_RESPONSE_CHARS = 2000

    class << self
      def call(user:, thread:, messages:)
        new(user: user, thread: thread, messages: messages).call
      end
    end

    def initialize(user:, thread:, messages:, client: Gemini::Client.new)
      @user = user
      @thread = thread
      @messages = messages
      @client = client
    end

    def call
      latest_text = latest_user_message
      history_decision = forced_history_decision(latest_text) || decide_history_requirement(latest_text)
      term_entry = Ai::TermDictionary.lookup(latest_text)
      decision = Ai::WebSearchDecision.decide(
        query: latest_text,
        responder_type: :general
      )
      Rails.logger.debug(
        "[AI][GeneralChatResponder] web_search=#{decision[:use_search]} reason=#{decision[:reason]} " \
        "history_required=#{history_decision[:requires_history]} history_window=#{history_decision[:history_window]} " \
        "term_hit=#{term_entry.present? ? term_entry[:key] : '-'}"
      )

      result = @client.generate_text_with_usage!(
        system_text: build_system_text,
        user_text: build_user_text(
          history_messages: selected_history_messages(history_decision[:history_window], required: history_decision[:requires_history])
        ),
        max_output_tokens: 7000,
        temperature: 0.45,
        user: user,
        feature: "chat",
        web_search: decision[:use_search]
      )

      if should_fallback_to_dictionary?(
        latest_text: latest_text,
        result_text: result[:text],
        sources: result[:sources],
        term_entry: term_entry
      )
        Rails.logger.info("[AI][GeneralChatResponder] dictionary_fallback key=#{term_entry[:key]}")
        dict_result = @client.generate_text_with_usage!(
          system_text: build_dictionary_system_text,
          user_text: build_dictionary_user_text(latest_text, term_entry),
          max_output_tokens: 7000,
          temperature: 0.3,
          user: user,
          feature: "chat",
          web_search: false
        )
        return finalize_text(dict_result[:text], sources: [])
      end

      text = finalize_text(result[:text], sources: result[:sources])
      return text unless should_retry_for_focus?(text, latest_text)

      Rails.logger.warn("[AI][GeneralChatResponder] focus_retry triggered")
      retry_result = @client.generate_text_with_usage!(
        system_text: build_focus_repair_system_text,
        user_text: build_focus_repair_user_text(latest_text),
        max_output_tokens: 7000,
        temperature: 0.35,
        user: user,
        feature: "chat",
        web_search: decision[:use_search]
      )
      finalize_text(retry_result[:text], sources: retry_result[:sources])
    end

    private

    attr_reader :user, :thread, :messages

    def latest_user_message
      msg = messages.reverse.find { |m| m.role.to_s == "user" }
      msg&.content.to_s
    end

    def build_system_text
      <<~SYS
        あなたはボイストレーニングの専属コーチです。
        この会話は「汎用トレーニング相談」です。AIおすすめの当日調整に限定しません。

        ルール:
        - 回答は日本語のプレーンテキスト（Markdown禁止）。
        - 回答は基本的に優しい口調で行い、安心感のある言い回しを優先する。
        - ユーザーのカスタム指示がある場合、回答スタイルはその指示を最優先する。
        - ユーザーへの呼びかけが必要な場合は「#{user_call_name}」を使う。display_name未設定時は「あなた」を使う。
        - 構造化された回答スタイル設定がある場合、カスタム指示で不足する部分のみ補助的に反映する。
        - 構造化スタイル設定:
          #{Ai::ResponseStylePreferences.summary_text(user.ai_response_style_prefs).lines.map { |line| "  #{line}" }.join}
        #{Ai::ResponseStylePreferences.prompt_rules(user.ai_response_style_prefs).map { |line| "  #{line}" }.join("\n")}
        - まず結論を短く答え、その後に必要な理由や次の一手を補う。
        - ユーザーが深掘りを求めていない限り、必要以上に話を広げない。
        - 単純な質問や確認には、簡潔で分かりやすく答える。
        - ただし、短すぎて説明不足にならないようにする。
        - 同じ内容の言い換え、長い前置き、過剰な補足は避ける。
        - 追質問（例: もっと詳しく、じゃあ具体的には、他には）には、前置きや言い換えを挟まず本題から答える。
        - ユーザーの質問内容を長く言い換えて繰り返さない。
        - 「もちろんです」「一緒に見ていきましょう」などの導入は多用しない。
        - 直前の話題が明確な場合は、その話題名を不必要に繰り返さずに説明へ入る。
        - 詳しい理由や比較、手順が必要なときだけ、説明を少し広げる。
        - 常に敬意ある口調で回答する。侮辱・高圧・断罪表現（例: お前、怠け、無能 など）を使わない。
        - 医療診断・治療の断定はしない。危険な内容は拒否して安全な代替案を示す。
        - 練習メニュー提案は、ユーザーが「メニュー」「練習方法」「次に何をするか」を求めた時だけ行う。
        - 用語説明・定義質問では、原則として説明に専念し、勝手に練習メニューへ展開しない。
        - 断定しすぎず、根拠が弱い場合は「観測不足」と明記する。
        - 文字数は必ず1200文字以内に収める。
        - 冗長な背景説明は避け、結論と実行手順を優先する。
        - 回答冒頭に「参照データ: ...」を1行入れ、何を根拠にしたか明示する。
        - Web検索由来の情報を使った場合は、末尾の「参考情報」を維持する。
        - スレッド名・過去会話の文脈よりも、最新の user 質問を必ず最優先する。
        - 直前までの話題と異なる質問が来たら、話題を切り替えて新しい質問に直接回答する。
      SYS
    end

    def build_user_text(history_messages:)
      if definition_question?(latest_user_message)
        return build_definition_mode_user_text
      end

      lines = []
      lines << "最優先質問:"
      lines << latest_user_message.presence || "(なし)"
      lines << "回答モード:"
      lines << (allow_practice_plan? ? "- 練習提案を含めてよい" : "- 用語/概念の説明を優先し、練習提案はしない")
      lines << (simple_question?(latest_user_message) ? "- 単純質問なので、簡潔だが説明不足にならない回答にする" : "- 必要に応じて理由と次の一手を補ってよい")
      lines << ""
      lines << "ユーザー情報:"
      lines << "- call_name: #{user_call_name}"
      lines << "- goal_text: #{user.goal_text.presence || '(未設定)'}"
      lines << "- ai_custom_instructions: #{user.ai_custom_instructions.to_s.presence || '(未設定)'}"
      lines << "- ai_response_style_prefs:"
      Ai::ResponseStylePreferences.summary_text(user.ai_response_style_prefs).each_line do |line|
        lines << "  #{line.chomp}"
      end
      lines << "- ai_improvement_tags: #{Array(user.ai_improvement_tags).join(' / ').presence || '(未設定)'}"
      long_profile_text = Ai::UserLongTermProfileManager.profile_text_for_prompt(user: user)
      lines << "- long_term_profile: #{long_profile_text.presence || '(未設定)'}"
      lines << ""
      lines << "直近ログ要約(30日):"
      lines.concat(recent_logs_summary)
      lines << ""
      lines << "直近のAIおすすめ(5件):"
      lines.concat(recent_recommendations_summary)
      lines << ""
      lines << "会話スレッド:"
      lines << "- project: #{thread.project&.name || '(未分類)'}"
      lines << ""
      if history_messages.present?
        lines << "会話履歴(参考情報。最新質問より優先しない):"
        history_messages.each do |message|
          lines << "#{message.role}: #{message.content.to_s.strip}"
        end
      else
        lines << "会話履歴: (未参照)"
      end
      lines << ""
      lines << "最新の user 発話に回答してください。"
      lines.join("\n")
    end

    def build_definition_mode_user_text
      lines = []
      lines << "最優先質問:"
      lines << latest_user_message.presence || "(なし)"
      lines << "回答モード:"
      lines << "- 用語/概念の説明を最優先"
      lines << "- この質問の説明だけに答える（別話題・履歴の再解釈は禁止）"
      lines << "- 練習メニュー提案はしない"
      lines << ""
      lines << "回答要件:"
      lines << "- 冒頭1文で『何か』を定義する"
      lines << "- その後に用途・注意点を簡潔に説明する"
      lines << "- 必要なら参考情報を末尾に付ける"
      lines.join("\n")
    end

    def simple_question?(text)
      normalized = text.to_s.gsub(/\s+/, " ").strip
      return false if normalized.blank?
      return false if normalized.length >= 70

      deep_keywords = %w[
        なぜ 理由 詳しく 具体的 比較 違い 手順 メニュー 練習方法 プラン 計画
        改善 原因 分析 診断 根拠 どう組む どう進め
      ]
      return false if deep_keywords.any? { |keyword| normalized.include?(keyword) }

      simple_keywords = %w[
        とは って何 どういう意味 どっち どちら 一言 簡単に 短く だけ 教えて
        いい 悪い 必要 いる ある
      ]

      normalized.end_with?("？", "?", "か") || simple_keywords.any? { |keyword| normalized.include?(keyword) }
    end

    def build_focus_repair_system_text
      <<~SYS
        あなたはボイストレーニングの説明アシスタントです。
        最新の user 質問に直接回答してください。過去の会話文脈への言及は禁止します。
        ルール:
        - 回答はプレーンテキスト（Markdown禁止）
        - 冒頭1文で質問対象を定義する
        - 練習提案はしない
        - 300〜900文字で簡潔にまとめる
      SYS
    end

    def build_focus_repair_user_text(latest_text)
      <<~TXT
        質問: #{latest_text}
        この質問にのみ答えてください。
      TXT
    end

    def build_dictionary_system_text
      <<~SYS
        あなたはボイストレーニング用語の説明アシスタントです。
        役割は、渡された内部辞書の定義を優先して、最新質問に正確に答えることです。
        ルール:
        - 回答はプレーンテキスト（Markdown禁止）
        - 冒頭1文で用語を定義する
        - 辞書の定義と矛盾する推測をしない
        - 練習メニュー提案へ勝手に展開しない
        - 300〜900文字で簡潔にまとめる
      SYS
    end

    def build_dictionary_user_text(latest_text, term_entry)
      lines = []
      lines << "質問: #{latest_text}"
      lines << "内部辞書キー: #{term_entry[:key]}"
      lines << "内部辞書の定義(最優先): #{term_entry[:definition]}"
      if term_entry[:how_to].present?
        lines << "内部辞書のやり方:"
        term_entry[:how_to].each { |row| lines << "- #{row}" }
      end
      if term_entry[:effects].present?
        lines << "内部辞書の効果:"
        term_entry[:effects].each { |row| lines << "- #{row}" }
      end
      if term_entry[:cautions].present?
        lines << "内部辞書の注意:"
        term_entry[:cautions].each { |row| lines << "- #{row}" }
      end
      lines << "上記内部辞書を最優先で回答してください。"
      lines.join("\n")
    end

    def decide_history_requirement(latest_text)
      judge_text = @client.generate_text!(
        system_text: history_judge_system_text,
        user_text: history_judge_user_text(latest_text),
        max_output_tokens: 220,
        temperature: 0.0,
        user: user,
        feature: "chat",
        web_search: false
      )
      parse_history_decision(judge_text)
    rescue => e
      Rails.logger.warn("[AI][GeneralChatResponder] history_judge_error #{e.class}: #{e.message}")
      { requires_history: false, history_window: 0, reason: "judge_error" }
    end

    def history_judge_system_text
      <<~SYS
        あなたの役割は、会話履歴が必要かどうかを判定することだけです。回答本文は作成しません。
        出力はJSONのみ。必ず次の形式:
        {"requires_history":true|false,"history_window":0|3|6,"reason":"短い理由"}
        ルール:
        - 最新質問だけで十分なら requires_history=false, history_window=0
        - 直前の発話を見ないと意味が確定しない省略質問・追質問なら true
        - 「もっと詳しく」「具体的に」「他には」「それで」「じゃあ」など、対象が省略されている質問は true 寄り
        - 比較・言い換え・続き・掘り下げ依頼で、直前文脈がないと答えにくい場合も true
        - 不明な場合は false ではなく、直前文脈がないと誤解しやすいなら true を優先
      SYS
    end

    def history_judge_user_text(latest_text)
      "最新質問: #{latest_text}"
    end

    def parse_history_decision(raw)
      text = raw.to_s
      json_str = text[/\{.*\}/m]
      raise ArgumentError, "invalid history decision" if json_str.blank?

      parsed = JSON.parse(json_str)
      required = parsed["requires_history"] == true
      window = parsed["history_window"].to_i
      window = 0 unless [ 0, 3, 6 ].include?(window)
      window = 0 unless required
      {
        requires_history: required,
        history_window: window,
        reason: parsed["reason"].to_s.presence || "llm_decision"
      }
    rescue JSON::ParserError, ArgumentError
      { requires_history: false, history_window: 0, reason: "judge_parse_fallback" }
    end

    def selected_history_messages(history_window, required:)
      return [] unless required
      return [] if history_window.to_i <= 0

      # 最新user質問は別途渡しているため履歴候補から除外
      candidates = messages[0...-1]
      return [] if candidates.blank?

      take_count = history_window.to_i * 2
      candidates.last(take_count)
    end

    def forced_history_decision(latest_text)
      normalized = latest_text.to_s.gsub(/\s+/, " ").strip
      return nil if normalized.blank?
      return nil if normalized.length > 40

      followup_phrases = [
        "もっと詳しく", "詳しく", "具体的に", "もう少し詳しく", "くわしく",
        "他には", "他だと", "たとえば", "例えば", "つまり", "要するに",
        "それで", "じゃあ", "では", "続き", "補足", "一言で", "簡単にいうと",
        "どういうこと", "どういうこと？", "どういうことですか", "なんで", "なぜ",
        "どっち", "どちら", "比較すると", "逆に", "その場合", "この場合"
      ]

      ambiguous_followup =
        followup_phrases.any? { |phrase| normalized.include?(phrase) } ||
        normalized.match?(/\A(?:それ|これ|その|この|前の|さっきの|今の)(?:について)?\z/) ||
        normalized.match?(/\A(?:もっと|もう少し).+\z/) ||
        normalized.match?(/\A.+(?:して|すると)?[?？]\z/)

      return nil unless ambiguous_followup

      { requires_history: true, history_window: 3, reason: "forced_followup_phrase" }
    end

    def allow_practice_plan?
      text = latest_user_message.to_s
      return false if text.blank?
      return false if definition_question?(text)

      plan_keywords = %w[練習 メニュー 次の一手 何をすれば やり方 方法 手順 プラン]
      plan_keywords.any? { |kw| text.include?(kw) }
    end

    def definition_question?(text)
      keywords = %w[とは 何ですか 何？ 意味 定義 解説 説明して]
      keywords.any? { |kw| text.include?(kw) }
    end

    def should_retry_for_focus?(response_text, latest_text)
      terms = focus_terms(latest_text)
      return false if terms.blank?

      terms.none? { |term| response_text.include?(term) }
    end

    def focus_terms(text)
      s = text.to_s
      terms = []
      terms.concat(s.scan(/[A-Za-z][A-Za-z0-9+#-]{2,}/))
      terms.concat(s.scan(/[ァ-ヶー]{3,}/))
      terms.map(&:strip).reject(&:blank?).uniq.first(3)
    end

    def should_fallback_to_dictionary?(latest_text:, result_text:, sources:, term_entry:)
      return false if term_entry.blank?
      return false unless definition_question?(latest_text.to_s)

      return true if Array(sources).blank?
      return true if weak_confidence_text?(result_text)
      return true if should_retry_for_focus?(result_text.to_s, latest_text.to_s)

      false
    end

    def weak_confidence_text?(text)
      t = text.to_s
      keywords = [ "不明", "断定でき", "情報が少ない", "はっきりしない", "一般的には" ]
      keywords.any? { |kw| t.include?(kw) }
    end

    def recent_logs_summary
      logs = user.training_logs
                 .where(practiced_on: 30.days.ago.to_date..Date.current)
                 .includes(:training_menus)
                 .order(practiced_on: :desc)
                 .limit(14)
      return [ "- (なし)" ] if logs.blank?

      logs.map do |log|
        menus = log.training_menus.map { |m| m.name.to_s }.reject(&:blank?).first(4)
        note = log.notes.to_s.gsub(/\s+/, " ").strip.slice(0, 80)
        parts = []
        parts << log.practiced_on.iso8601
        parts << "時間#{log.duration_min.to_i}分"
        parts << "メニュー:#{menus.join('/')}" if menus.any?
        parts << "メモ:#{note}" if note.present?
        "- #{parts.join(' | ')}"
      end
    end

    def recent_recommendations_summary
      rows = user.ai_recommendations.order(generated_for_date: :desc, created_at: :desc).limit(5)
      return [ "- (なし)" ] if rows.blank?

      rows.map do |rec|
        text = rec.recommendation_text.to_s.gsub(/\s+/, " ").strip.slice(0, 90)
        "- #{rec.generated_for_date.iso8601} / 参照#{rec.range_days}日 / #{text}"
      end
    end

    def finalize_text(text, sources: [])
      v = sanitize_markdown(text.to_s)
      v = append_sources(v, sources)
      return "" if v.blank?
      if v.length > MAX_RESPONSE_CHARS
        v = v.slice(0, MAX_RESPONSE_CHARS)
        # 末尾が句読点で終わる位置まで丸める
        punct_idx = v.rindex(/[。！？.!?]/)
        v = punct_idx ? v.slice(0, punct_idx + 1) : v
        # 箇条書き番号だけで終わる不自然な切れ方を防ぐ
        v = v.gsub(/(?:\n|\A)\s*\d+[.)]?\s*\z/, "").strip
      end
      v = normalize_tone(v)
      return v if v.match?(/[。！？.!?]\z/)

      "#{v}。"
    end

    def append_sources(text, sources)
      rows = Array(sources).map do |source|
        title = source[:title].to_s.strip
        url = source[:url].to_s.strip
        next nil if url.blank?
        title = "参考情報" if title.blank?
        "#{title}(#{url})"
      end.compact.uniq.first(3)
      return text if rows.blank?

      [ text, "参考情報: #{rows.join(' / ')}" ].join("\n")
    end

    def sanitize_markdown(text)
      v = text.to_s.gsub(/\r\n?/, "\n")
      v = v.gsub(/```[A-Za-z0-9_-]*\n?/, "")
      v = v.gsub("```", "")
      v = v.gsub(/`([^`]+)`/, '\1')
      v = v.gsub(/\[([^\]]+)\]\(([^)]+)\)/, '\1（\2）')
      v = v.gsub(/^\s{0,3}\#{1,6}\s+/m, "")
      v = v.gsub(/^\s*>\s?/m, "")
      v = v.gsub(/^\s*[-*]\s+/m, "・")
      v = v.gsub(/\*\*(.+?)\*\*/, '\1')
      v = v.gsub(/__(.+?)__/, '\1')
      v = v.gsub(/\n{3,}/, "\n\n")
      v.strip
    end

    def normalize_tone(text)
      v = text.to_s
      v = v.gsub("お前", "あなた")
      v = v.gsub("怠け", "無理をしない")
      v
    end

    def user_call_name
      Ai::UserCallName.resolve(user)
    end
  end
end
