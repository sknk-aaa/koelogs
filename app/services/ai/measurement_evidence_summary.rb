# frozen_string_literal: true

module Ai
  class MeasurementEvidenceSummary
    RECENT_LIMIT = 10
    AVG_WINDOW = 5

    VOLUME_STABILITY_DB_EPS = 1.0
    PITCH_SEMITONE_EPS = 0.1
    LONG_TONE_SEC_EPS = 2.0
    RANGE_LOWEST_SEMITONE_EPS = 1.0

    TYPE_LABELS = {
      "range" => "音域",
      "long_tone" => "ロングトーン",
      "pitch_accuracy" => "音程精度",
      "volume_stability" => "音量安定性"
    }.freeze

    TAG_TO_TYPES = {
      "high_note_ease" => [ "range" ],
      "range_breadth" => [ "range" ],
      "long_tone_sustain" => [ "long_tone" ],
      "pitch_accuracy" => [ "pitch_accuracy" ],
      "pitch_stability" => [ "pitch_accuracy" ],
      "volume_stability" => [ "volume_stability" ]
    }.freeze

    GOAL_KEYWORDS = {
      "range" => %w[音域 最低音 高音 レンジ],
      "long_tone" => %w[ロングトーン 持続 秒 伸ばす],
      "pitch_accuracy" => %w[音程 ピッチ cents セント 音准 精度],
      "volume_stability" => %w[音量 安定 dB デシベル]
    }.freeze
    NOTE_KEYWORDS = GOAL_KEYWORDS

    NOTE_OFFSETS = {
      "C" => 0,
      "D" => 2,
      "E" => 4,
      "F" => 5,
      "G" => 7,
      "A" => 9,
      "B" => 11
    }.freeze
    NOTE_REGEX = /\A([A-G])([#b]?)(-?\d)\z/

    class << self
      def build(user:, improvement_tags:, goal_text:, logs:)
        new(user: user, improvement_tags: improvement_tags, goal_text: goal_text, logs: logs).build
      end
    end

    def initialize(user:, improvement_tags:, goal_text:, logs:)
      @user = user
      @improvement_tags = Array(improvement_tags).map(&:to_s)
      @goal_text = goal_text.to_s
      @logs = Array(logs)
    end

    def build
      reasons_by_type = reasons_by_type()
      items = reasons_by_type.keys.filter_map do |measurement_type|
        runs = recent_runs_for(measurement_type)
        next if runs.empty?

        item_for(measurement_type, runs, reasons_by_type[measurement_type])
      end

      {
        used: items.any?,
        items: items
      }
    rescue => e
      Rails.logger.warn("[AI][MeasurementEvidenceSummary] #{e.class}: #{e.message}")
      { used: false, items: [] }
    end

    private

    attr_reader :user, :improvement_tags, :goal_text, :logs

    def reasons_by_type
      out = Hash.new { |h, k| h[k] = [] }

      improvement_tags.each do |tag|
        Array(TAG_TO_TYPES[tag]).each do |measurement_type|
          out[measurement_type] << "改善タグ"
        end
      end

      normalized_goal = normalize_text(goal_text)
      if normalized_goal.present?
        GOAL_KEYWORDS.each do |measurement_type, keywords|
          out[measurement_type] << "目標" if match_any_keyword?(normalized_goal, keywords)
        end
      end

      normalized_notes = normalize_text(logs.map { |log| log.respond_to?(:notes) ? log.notes.to_s : "" }.join("\n"))
      if normalized_notes.present?
        NOTE_KEYWORDS.each do |measurement_type, keywords|
          out[measurement_type] << "自由記述" if match_any_keyword?(normalized_notes, keywords)
        end
      end

      out.transform_values(&:uniq).reject { |_k, v| v.empty? }
    end

    def recent_runs_for(measurement_type)
      scope = user.measurement_runs
                  .where(include_in_insights: true, measurement_type: measurement_type)
                  .latest_first
                  .limit(RECENT_LIMIT)
      case measurement_type
      when "range"
        scope.includes(:range_result)
      when "long_tone"
        scope.includes(:long_tone_result)
      when "pitch_accuracy"
        scope.includes(:pitch_accuracy_result)
      when "volume_stability"
        scope.includes(:volume_stability_result)
      else
        MeasurementRun.none
      end.to_a
    end

    def item_for(measurement_type, runs, reasons)
      case measurement_type
      when "range"
        build_range_item(runs, reasons)
      when "long_tone"
        build_long_tone_item(runs, reasons)
      when "pitch_accuracy"
        build_pitch_accuracy_item(runs, reasons)
      when "volume_stability"
        build_volume_stability_item(runs, reasons)
      end
    end

    def build_range_item(runs, reasons)
      points = runs.filter_map do |run|
        result = run.range_result
        next if result.nil?

        lowest_midi = note_to_midi(result.lowest_note)
        {
          recorded_at: run.recorded_at,
          lowest_note: result.lowest_note.to_s,
          highest_note: result.highest_note.to_s,
          range_semitones: result.range_semitones&.to_f,
          lowest_note_midi: lowest_midi
        }
      end
      return nil if points.empty?

      latest = points.first
      count = points.size
      avg_count = [ count, AVG_WINDOW ].min
      avg_last_n_range = average(points.first(avg_count).map { |v| v[:range_semitones] })
      avg_last_5_lowest_midi = average(points.first(AVG_WINDOW).map { |v| v[:lowest_note_midi] })
      avg_prev_5_lowest_midi = average(points[AVG_WINDOW, AVG_WINDOW].to_a.map { |v| v[:lowest_note_midi] })
      delta_vs_prev_5 = if avg_last_5_lowest_midi && avg_prev_5_lowest_midi
                          avg_last_5_lowest_midi - avg_prev_5_lowest_midi
      end

      facts = []
      facts << "最新(#{latest[:recorded_at]&.to_date&.iso8601}): 最低音 #{latest[:lowest_note]} / 最高音 #{latest[:highest_note]} / 音域 #{format_number(latest[:range_semitones])}半音"
      if count == 1
        facts << "比較: 1回のみのため傾向比較は保留"
      elsif count < AVG_WINDOW
        facts << "直近#{count}回平均: 音域 #{format_number(avg_last_n_range)}半音（比較はデータ不足）"
      else
        facts << "直近#{AVG_WINDOW}回平均: 音域 #{format_number(avg_last_n_range)}半音"
        if delta_vs_prev_5
          facts << "最低音トレンド: 前#{AVG_WINDOW}回平均との差 #{signed(delta_vs_prev_5)}半音（#{classify(delta_vs_prev_5, RANGE_LOWEST_SEMITONE_EPS, better: :lower)}）"
        else
          facts << "最低音トレンド: 前#{AVG_WINDOW}回比較はデータ不足"
        end
      end

      {
        measurement_type: "range",
        label: TYPE_LABELS["range"],
        reasons: reasons,
        count: count,
        facts: facts
      }
    end

    def build_long_tone_item(runs, reasons)
      points = runs.filter_map do |run|
        result = run.long_tone_result
        next if result.nil?

        {
          recorded_at: run.recorded_at,
          sustain_sec: result.sustain_sec&.to_f,
          sustain_note: result.sustain_note.to_s
        }
      end
      return nil if points.empty?

      latest = points.first
      count = points.size
      avg_count = [ count, AVG_WINDOW ].min
      avg_last_n = average(points.first(avg_count).map { |v| v[:sustain_sec] })
      avg_last_5 = average(points.first(AVG_WINDOW).map { |v| v[:sustain_sec] })
      avg_prev_5 = average(points[AVG_WINDOW, AVG_WINDOW].to_a.map { |v| v[:sustain_sec] })
      delta_vs_prev_5 = avg_last_5 && avg_prev_5 ? (avg_last_5 - avg_prev_5) : nil

      facts = []
      facts << "最新(#{latest[:recorded_at]&.to_date&.iso8601}): ロングトーン #{format_number(latest[:sustain_sec])}秒#{latest[:sustain_note].present? ? " (#{latest[:sustain_note]})" : ''}"
      if count == 1
        facts << "比較: 1回のみのため傾向比較は保留"
      elsif count < AVG_WINDOW
        facts << "直近#{count}回平均: #{format_number(avg_last_n)}秒（比較はデータ不足）"
      else
        facts << "直近#{AVG_WINDOW}回平均: #{format_number(avg_last_n)}秒"
        if delta_vs_prev_5
          facts << "持続トレンド: 前#{AVG_WINDOW}回平均との差 #{signed(delta_vs_prev_5)}秒（#{classify(delta_vs_prev_5, LONG_TONE_SEC_EPS, better: :higher)}）"
        else
          facts << "持続トレンド: 前#{AVG_WINDOW}回比較はデータ不足"
        end
      end

      {
        measurement_type: "long_tone",
        label: TYPE_LABELS["long_tone"],
        reasons: reasons,
        count: count,
        facts: facts
      }
    end

    def build_pitch_accuracy_item(runs, reasons)
      points = runs.filter_map do |run|
        result = run.pitch_accuracy_result
        next if result.nil?
        next if result.avg_cents_error.nil?

        {
          recorded_at: run.recorded_at,
          avg_error_semitones: result.avg_cents_error.to_f.abs / 100.0,
          avg_cents_error: result.avg_cents_error.to_f,
          accuracy_score: result.accuracy_score&.to_f,
          note_count: result.note_count
        }
      end
      return nil if points.empty?

      latest = points.first
      count = points.size
      avg_count = [ count, AVG_WINDOW ].min
      avg_last_n = average(points.first(avg_count).map { |v| v[:avg_error_semitones] })
      avg_last_5 = average(points.first(AVG_WINDOW).map { |v| v[:avg_error_semitones] })
      avg_prev_5 = average(points[AVG_WINDOW, AVG_WINDOW].to_a.map { |v| v[:avg_error_semitones] })
      delta_vs_prev_5 = avg_last_5 && avg_prev_5 ? (avg_last_5 - avg_prev_5) : nil

      facts = []
      facts << "最新(#{latest[:recorded_at]&.to_date&.iso8601}): 平均誤差 #{format_number(latest[:avg_error_semitones])}半音 / 精度スコア #{format_number(latest[:accuracy_score])}"
      if count == 1
        facts << "比較: 1回のみのため傾向比較は保留"
      elsif count < AVG_WINDOW
        facts << "直近#{count}回平均: 平均誤差 #{format_number(avg_last_n)}半音（比較はデータ不足）"
      else
        facts << "直近#{AVG_WINDOW}回平均: 平均誤差 #{format_number(avg_last_n)}半音"
        if delta_vs_prev_5
          facts << "誤差トレンド: 前#{AVG_WINDOW}回平均との差 #{signed(delta_vs_prev_5)}半音（#{classify(delta_vs_prev_5, PITCH_SEMITONE_EPS, better: :lower)}）"
        else
          facts << "誤差トレンド: 前#{AVG_WINDOW}回比較はデータ不足"
        end
      end

      {
        measurement_type: "pitch_accuracy",
        label: TYPE_LABELS["pitch_accuracy"],
        reasons: reasons,
        count: count,
        facts: facts
      }
    end

    def build_volume_stability_item(runs, reasons)
      points = runs.filter_map do |run|
        result = run.volume_stability_result
        next if result.nil?
        next if result.loudness_range_db.nil?

        {
          recorded_at: run.recorded_at,
          loudness_range_db: result.loudness_range_db.to_f,
          avg_loudness_db: result.avg_loudness_db&.to_f
        }
      end
      return nil if points.empty?

      latest = points.first
      count = points.size
      avg_count = [ count, AVG_WINDOW ].min
      avg_last_n = average(points.first(avg_count).map { |v| v[:loudness_range_db] })
      avg_last_5 = average(points.first(AVG_WINDOW).map { |v| v[:loudness_range_db] })
      avg_prev_5 = average(points[AVG_WINDOW, AVG_WINDOW].to_a.map { |v| v[:loudness_range_db] })
      delta_vs_prev_5 = avg_last_5 && avg_prev_5 ? (avg_last_5 - avg_prev_5) : nil

      facts = []
      facts << "最新(#{latest[:recorded_at]&.to_date&.iso8601}): 音量レンジ #{format_number(latest[:loudness_range_db])}dB / 平均音量 #{format_number(latest[:avg_loudness_db])}dB"
      if count == 1
        facts << "比較: 1回のみのため傾向比較は保留"
      elsif count < AVG_WINDOW
        facts << "直近#{count}回平均: 音量レンジ #{format_number(avg_last_n)}dB（比較はデータ不足）"
      else
        facts << "直近#{AVG_WINDOW}回平均: 音量レンジ #{format_number(avg_last_n)}dB"
        if delta_vs_prev_5
          facts << "音量安定トレンド: 前#{AVG_WINDOW}回平均との差 #{signed(delta_vs_prev_5)}dB（#{classify(delta_vs_prev_5, VOLUME_STABILITY_DB_EPS, better: :lower)}）"
        else
          facts << "音量安定トレンド: 前#{AVG_WINDOW}回比較はデータ不足"
        end
      end

      {
        measurement_type: "volume_stability",
        label: TYPE_LABELS["volume_stability"],
        reasons: reasons,
        count: count,
        facts: facts
      }
    end

    def average(values)
      usable = Array(values).filter_map do |value|
        next if value.nil?

        value.to_f
      end
      return nil if usable.empty?

      usable.sum / usable.size
    end

    def format_number(value)
      return "-" if value.nil?

      format("%.2f", value.to_f)
    end

    def signed(value)
      return "-" if value.nil?

      format("%+.2f", value.to_f)
    end

    def classify(delta, epsilon, better:)
      return "横ばい" if delta.nil? || delta.to_f.abs < epsilon

      if better == :lower
        delta.to_f <= -epsilon ? "改善" : "悪化"
      else
        delta.to_f >= epsilon ? "改善" : "悪化"
      end
    end

    def note_to_midi(note)
      m = note.to_s.strip.match(NOTE_REGEX)
      return nil unless m

      name = m[1]
      accidental = m[2]
      octave = m[3].to_i
      base = NOTE_OFFSETS[name]
      return nil if base.nil?

      delta = accidental == "#" ? 1 : accidental == "b" ? -1 : 0
      (octave + 1) * 12 + base + delta
    end

    def normalize_text(text)
      text.to_s.downcase.tr("Ａ-Ｚａ-ｚ０-９", "a-z0-9")
    end

    def match_any_keyword?(text, keywords)
      keywords.any? { |keyword| text.include?(keyword.to_s.downcase) }
    end
  end
end
