# frozen_string_literal: true

module Ai
  class AnalysisFeedbackGenerator
    def initialize(client: Gemini::Client.new)
      @client = client
    end

    def generate!(menu_name:, focus_points:, metrics:, selected_metrics: nil)
      @client.generate_text!(
        system_text: system_text,
        user_text: user_text(menu_name:, focus_points:, metrics:, selected_metrics:),
        max_output_tokens: 5000,
        temperature: 0.4
      )
    end

    private

    def system_text
      <<~SYS
        あなたはボイストレーニングのコーチです。
        与えられた分析結果に対して、初心者にも分かる短い助言を日本語で返してください。
        ルール:
        - 120〜220文字
        - 必ず「良い点」を1つ、「次回の改善点」を1つ含める
        - 断定しすぎず、実践しやすい行動にする
      SYS
    end

    def user_text(menu_name:, focus_points:, metrics:, selected_metrics:)
      selected = Array(selected_metrics).presence || %w[pitch_stability pitch_accuracy volume_stability]
      metric_lines = []
      metric_lines << "- 録音秒数: #{metrics[:duration_sec]}"
      metric_lines << "- 発声時間(秒): #{metrics[:phonation_duration_sec]}" if selected.include?("phonation_duration")
      metric_lines << "- 最高音: #{metrics[:peak_note] || "-"}" if selected.include?("peak_note")
      metric_lines << "- 発声の大きさ平均(dB): #{metrics[:avg_loudness_db]}" if selected.include?("avg_loudness")
      metric_lines << "- 安定度: #{metrics[:pitch_stability_score]}" if selected.include?("pitch_stability")
      metric_lines << "- 音程精度: #{metrics[:pitch_accuracy_score]}" if selected.include?("pitch_accuracy")
      metric_lines << "- 音量安定: #{metrics[:volume_stability_score]}" if selected.include?("volume_stability")

      <<~USR
        メニュー名: #{menu_name}
        意識ポイント: #{focus_points.presence || "(未設定)"}
        判定項目: #{selected.join(", ")}
        測定結果:
        #{metric_lines.join("\n")}
      USR
    end
  end
end
