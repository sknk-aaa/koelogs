# frozen_string_literal: true

module Ai
  class RecommendationFollowupResponder
    SYSTEM_PROMPT_VERSION = "followup-v1"
    USER_PROMPT_VERSION = "followup-v1"
    RADICAL_CHANGE_TEMPLATE = "この会話では、当日のおすすめの具体化・調整のみ対応できます。大幅な変更は再生成をご利用ください。"
    SAFETY_TEMPLATE = "安全上の理由でその内容には対応できません。声のケアや練習の範囲で、当日の提案を調整する質問に切り替えてください。"

    class << self
      def call(recommendation:, context_snapshot:, messages:)
        new(recommendation: recommendation, context_snapshot: context_snapshot, messages: messages).call
      end
    end

    def initialize(recommendation:, context_snapshot:, messages:, client: Gemini::Client.new)
      @recommendation = recommendation
      @context_snapshot = context_snapshot
      @messages = messages
      @client = client
    end

    def call
      latest_user_text = latest_user_message.to_s
      return RADICAL_CHANGE_TEMPLATE if radical_change_request?(latest_user_text)
      return SAFETY_TEMPLATE if unsafe_request?(latest_user_text)

      decision = Ai::WebSearchDecision.decide(
        query: latest_user_text,
        responder_type: :recommendation_followup,
        menu_names: recommended_menu_names
      )
      Rails.logger.debug("[AI][RecommendationFollowupResponder] web_search=#{decision[:use_search]} reason=#{decision[:reason]}")

      result = @client.generate_text_with_usage!(
        system_text: build_system_text,
        user_text: build_user_text,
        max_output_tokens: 7000,
        temperature: 0.35,
        user: recommendation.user,
        feature: "followup",
        web_search: decision[:use_search]
      )
      finalize_text(result[:text], sources: result[:sources])
    end

    private

    attr_reader :recommendation, :context_snapshot, :messages

    def latest_user_message
      msg = messages.reverse.find { |m| m.role.to_s == "user" }
      msg&.content.to_s
    end

    def radical_change_request?(text)
      normalized = text.to_s
      keywords = [
        "全部変", "全体を変", "ゼロから", "最初から作り直", "再生成", "ガラッと", "別メニューで作り直", "全面的に変更"
      ]
      keywords.any? { |kw| normalized.include?(kw) }
    end

    def unsafe_request?(text)
      normalized = text.to_s
      medical = [ "診断", "治療", "薬", "病気", "医療行為", "処方" ]
      inappropriate = [ "違法", "危険行為", "中傷", "差別", "ハラスメント" ]
      (medical + inappropriate).any? { |kw| normalized.include?(kw) }
    end

    def build_system_text
      <<~SYS
        あなたはボイストレーニングアプリのフォローアップコーチです。
        この会話の役割は「当日のおすすめ」の具体化・調整に限定します。

        ルール:
        - 回答は基本的に優しい口調で行い、安心感のある言い回しを優先する。
        - ユーザーのカスタム指示がある場合、回答スタイルはその指示を最優先する。
        - ユーザーへの呼びかけが必要な場合は「#{user_call_name}」を使う。display_name未設定時は「あなた」を使う。
        - 構造化された回答スタイル設定がある場合、カスタム指示で不足する部分のみ補助的に反映する。
        - 構造化スタイル設定:
          #{Ai::ResponseStylePreferences.summary_text(recommendation.user&.ai_response_style_prefs).lines.map { |line| "  #{line}" }.join}
        #{Ai::ResponseStylePreferences.prompt_rules(recommendation.user&.ai_response_style_prefs).map { |line| "  #{line}" }.join("\n")}
        - 元のおすすめの方針を保ったまま、時間配分・順序・注意点・代替メニューを具体化する。
        - 全面的な作り直し要求には対応せず、再生成導線を案内する。
        - 医療的な診断・治療の断定はしない。
        - 不適切/危険な要求には丁寧に拒否し、安全な代替案を示す。
        - 回答は簡潔なプレーンテキスト（120〜320文字目安）。Markdown記法は使わない。
        - 読みやすさのため、絵文字付きの短い見出しを使ってよい。推奨構成:
          🧭 まずはここ
          🎯 調整ポイント
          ✅ 次の一手
        - 箇条書きは「・」を使って2〜4行でまとめる。
        - 返答の最後は必ず文を完結させる。
        - スレッド名や過去会話の流れより、最新の user 質問を最優先する。
        - 前の話題と違う質問が来たら、その質問に直接回答する。
      SYS
    end

    def build_user_text
      lines = []
      lines << "最優先質問:"
      lines << latest_user_message.presence || "(なし)"
      lines << ""
      lines << "ユーザー呼称: #{user_call_name}"
      lines << "ユーザーAI設定（カスタム指示）: #{user_custom_instructions.presence || '(未設定)'}"
      lines << "ユーザーAI設定（回答スタイル）:"
      Ai::ResponseStylePreferences.summary_text(recommendation.user&.ai_response_style_prefs).each_line do |line|
        lines << line.chomp
      end
      lines << ""
      lines << "おすすめ対象日: #{recommendation.generated_for_date.iso8601}"
      lines << "元のおすすめ:"
      lines << recommendation.recommendation_text.to_s
      lines << ""
      lines << "生成時コンテキスト(スナップショット):"
      lines << context_snapshot.to_json
      lines << ""
      lines << "会話履歴(参考情報。最新質問より優先しない):"
      recent_messages.each do |message|
        lines << "#{message.role}: #{message.content.to_s.strip}"
      end
      lines << ""
      lines << "上記を踏まえ、最新の user 発話に回答してください。"
      lines.join("\n")
    end

    def recent_messages
      messages.last(12)
    end

    def user_custom_instructions
      recommendation.user&.ai_custom_instructions.to_s.gsub(/\s+/, " ").strip
    end

    def user_call_name
      Ai::UserCallName.resolve(recommendation.user)
    end

    def finalize_text(text, sources: [])
      v = sanitize_markdown(text.to_s)
      v = append_sources(v, sources)
      return v if v.blank?
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
      end.compact.uniq.first(2)
      return text if rows.blank?

      [ text, "参考情報: #{rows.join(' / ')}" ].join("\n")
    end

    def recommended_menu_names
      recommendation.recommendation_text.to_s.lines.filter_map do |line|
        next unless line.include?("|")
        candidate = line.split("|").first.to_s.strip
        next if candidate.blank?

        candidate
      end.uniq.first(8)
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
  end
end
