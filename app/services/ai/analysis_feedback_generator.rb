# frozen_string_literal: true

require "json"

module Ai
  class AnalysisFeedbackGenerator
    METRIC_LABELS = {
      "pitch_stability" => "ピッチ安定度",
      "pitch_accuracy" => "音程精度",
      "volume_stability" => "音量安定",
      "phonation_duration" => "発声時間",
      "peak_note" => "最高音",
      "avg_loudness" => "発声の大きさの平均"
    }.freeze

    def initialize(client: Gemini::Client.new)
      @client = client
    end

    def generate!(menu_name:, focus_points:, metrics:, selected_metrics: nil)
      selected = normalize_selected_metrics(selected_metrics)
      text = @client.generate_text!(
        system_text: system_text,
        user_text: user_text(menu_name:, focus_points:, metrics:, selected_metrics: selected),
        max_output_tokens: 900,
        temperature: 0.15
      )
      parsed = extract_json(text)
      feedback_json = normalize_feedback_json(parsed, selected, metrics)
      {
        feedback_text: build_feedback_text(feedback_json),
        feedback_json: feedback_json
      }
    rescue JSON::ParserError
      feedback_json = fallback_feedback_json(selected, metrics)
      {
        feedback_text: build_feedback_text(feedback_json),
        feedback_json: feedback_json
      }
    end

    private

    def system_text
      <<~SYS
        あなたはボイストレーニングの分析官です。
        与えられた測定値から、判定項目ごとの「評価点」と「評価理由」を説明してください。
        出力は必ずJSONのみ。前置き・後置き・Markdownは禁止です。

        出力JSON仕様:
        {
          "version": 1,
          "summary": "全体所見（1文）",
          "evaluations": [
            {
              "metric_key": "pitch_stability | pitch_accuracy | volume_stability | phonation_duration | peak_note | avg_loudness",
              "score": 0..100 または null,
              "reason": "評価理由（40〜120文字）",
              "evidence": ["根拠1", "根拠2"]
            }
          ],
          "note": "評価の前提や不確実性（必要な場合のみ）"
        }

        ルール:
        - アドバイスは禁止（例: 「次は〜しましょう」は書かない）
        - 「reason」は、入力値に基づいて説明する
        - 「evidence」は具体的な測定値を必ず含める
        - 不明な項目は score=null として理由に「評価に必要なデータ不足」を明記する
        - evaluations は入力の判定項目のみ返す
      SYS
    end

    def user_text(menu_name:, focus_points:, metrics:, selected_metrics:)
      metric_lines = []
      metric_lines << "- 録音秒数: #{metrics[:duration_sec]}"
      metric_lines << "- 発声時間(秒): #{metrics[:phonation_duration_sec] || "-"}" if selected_metrics.include?("phonation_duration")
      metric_lines << "- 最高音: #{metrics[:peak_note] || "-"}" if selected_metrics.include?("peak_note")
      metric_lines << "- 発声の大きさ平均(dB): #{metrics[:avg_loudness_db] || "-"}" if selected_metrics.include?("avg_loudness")
      metric_lines << "- ピッチ安定度: #{metrics[:pitch_stability_score] || "-"}" if selected_metrics.include?("pitch_stability")
      metric_lines << "- 音程精度: #{metrics[:pitch_accuracy_score] || "-"}" if selected_metrics.include?("pitch_accuracy")
      metric_lines << "- 音量安定: #{metrics[:volume_stability_score] || "-"}" if selected_metrics.include?("volume_stability")

      <<~USR
        メニュー名: #{menu_name}
        意識ポイント: #{focus_points.presence || "(未設定)"}
        判定項目: #{selected_metrics.join(", ")}
        測定結果:
        #{metric_lines.join("\n")}
      USR
    end

    def normalize_selected_metrics(selected_metrics)
      selected = Array(selected_metrics).map(&:to_s)
      selected = %w[pitch_stability pitch_accuracy volume_stability] if selected.empty?
      filtered = selected.select { |key| METRIC_LABELS.key?(key) }
      filtered = %w[pitch_stability pitch_accuracy volume_stability] if filtered.empty?
      filtered
    end

    def extract_json(text)
      trimmed = text.to_s.strip
      return JSON.parse(trimmed) if trimmed.start_with?("{") && trimmed.end_with?("}")

      body = trimmed[/\{.*\}/m]
      raise JSON::ParserError, "JSON body not found" if body.blank?

      JSON.parse(body)
    end

    def normalize_feedback_json(parsed, selected_metrics, metrics)
      return fallback_feedback_json(selected_metrics, metrics) unless parsed.is_a?(Hash)

      evaluations_src = parsed["evaluations"]
      return fallback_feedback_json(selected_metrics, metrics) unless evaluations_src.is_a?(Array)

      normalized = selected_metrics.filter_map do |key|
        row = evaluations_src.find { |e| e.is_a?(Hash) && e["metric_key"].to_s == key }
        next fallback_evaluation(key, metrics) if row.nil?

        score_raw = row["score"]
        score =
          if score_raw.nil?
            nil
          else
            Integer(score_raw, exception: false)&.clamp(0, 100)
          end

        reason = row["reason"].to_s.strip
        reason = fallback_reason(key, metrics) if reason.blank?

        evidence = Array(row["evidence"]).map(&:to_s).map(&:strip).reject(&:blank?).first(3)
        evidence = fallback_evidence(key, metrics) if evidence.empty?

        {
          "metric_key" => key,
          "metric_label" => METRIC_LABELS[key],
          "score" => score,
          "reason" => reason,
          "evidence" => evidence
        }
      end

      summary = parsed["summary"].to_s.strip
      summary = "選択した判定項目について、測定値に基づいて評価理由を整理しました。" if summary.blank?
      note = parsed["note"].to_s.strip

      payload = {
        "version" => 1,
        "summary" => summary,
        "evaluations" => normalized
      }
      payload["note"] = note if note.present?
      payload
    end

    def fallback_feedback_json(selected_metrics, metrics)
      {
        "version" => 1,
        "summary" => "選択した判定項目について、測定値に基づいて評価理由を整理しました。",
        "evaluations" => selected_metrics.map { |key| fallback_evaluation(key, metrics) },
        "note" => "一部項目は推定ではなく、取得済みの測定値だけで評価しています。"
      }
    end

    def fallback_evaluation(metric_key, metrics)
      {
        "metric_key" => metric_key,
        "metric_label" => METRIC_LABELS[metric_key],
        "score" => fallback_score(metric_key, metrics),
        "reason" => fallback_reason(metric_key, metrics),
        "evidence" => fallback_evidence(metric_key, metrics)
      }
    end

    def fallback_score(metric_key, metrics)
      value =
        case metric_key
        when "pitch_stability" then metrics[:pitch_stability_score]
        when "pitch_accuracy" then metrics[:pitch_accuracy_score]
        when "volume_stability" then metrics[:volume_stability_score]
        else nil
        end
      return nil if value.nil?

      Integer(value, exception: false)&.clamp(0, 100)
    end

    def fallback_reason(metric_key, metrics)
      case metric_key
      when "pitch_stability"
        value = metrics[:pitch_stability_score]
        return "ピッチ安定度の計測値が取得できていないため、この項目は評価できません。" if value.nil?
        "ピッチ安定度は#{value}点で、録音中の音程の揺れがこの値として計測されました。"
      when "pitch_accuracy"
        value = metrics[:pitch_accuracy_score]
        return "音程精度の計測値が取得できていないため、この項目は評価できません。" if value.nil?
        "音程精度は#{value}点で、狙った音高中心への一致度がこの値として計測されました。"
      when "volume_stability"
        value = metrics[:volume_stability_score]
        return "音量安定の計測値が取得できていないため、この項目は評価できません。" if value.nil?
        "音量安定は#{value}点で、発声中の音量ばらつきがこの値として計測されました。"
      when "phonation_duration"
        value = metrics[:phonation_duration_sec]
        return "発声時間の計測値が取得できていないため、この項目は評価できません。" if value.nil?
        "有効な発声区間は#{value}秒で、録音時間内に継続して発声できた時間として算出されています。"
      when "peak_note"
        note = metrics[:peak_note]
        return "最高音の計測値が取得できていないため、この項目は評価できません。" if note.blank?
        "最高音は#{note}で、録音中に検出された最も高い音として記録されています。"
      when "avg_loudness"
        value = metrics[:avg_loudness_db]
        return "平均音量の計測値が取得できていないため、この項目は評価できません。" if value.nil?
        "発声の大きさ平均は#{value}dBで、発声区間全体の音量平均として算出されています。"
      else
        "評価に必要な項目が不足しているため、この項目は評価できません。"
      end
    end

    def fallback_evidence(metric_key, metrics)
      duration = metrics[:duration_sec] || 0
      case metric_key
      when "pitch_stability"
        [ "ピッチ安定度: #{metrics[:pitch_stability_score] || "-"}", "録音秒数: #{duration}" ]
      when "pitch_accuracy"
        [ "音程精度: #{metrics[:pitch_accuracy_score] || "-"}", "録音秒数: #{duration}" ]
      when "volume_stability"
        [ "音量安定: #{metrics[:volume_stability_score] || "-"}", "録音秒数: #{duration}" ]
      when "phonation_duration"
        [ "発声時間(秒): #{metrics[:phonation_duration_sec] || "-"}", "録音秒数: #{duration}" ]
      when "peak_note"
        [ "最高音: #{metrics[:peak_note] || "-"}", "録音秒数: #{duration}" ]
      when "avg_loudness"
        [ "発声の大きさ平均(dB): #{metrics[:avg_loudness_db] || "-"}", "録音秒数: #{duration}" ]
      else
        [ "録音秒数: #{duration}" ]
      end
    end

    def build_feedback_text(feedback_json)
      summary = feedback_json["summary"].to_s.strip
      rows = Array(feedback_json["evaluations"]).filter_map do |row|
        next unless row.is_a?(Hash)

        label = row["metric_label"].to_s.strip
        score = row["score"]
        reason = row["reason"].to_s.strip
        next if label.blank? || reason.blank?

        score_text = score.nil? ? "評価不可" : "#{score}点"
        "#{label}(#{score_text}): #{reason}"
      end
      note = feedback_json["note"].to_s.strip

      [ summary, *rows, note.presence ].compact.join("\n")
    end
  end
end
