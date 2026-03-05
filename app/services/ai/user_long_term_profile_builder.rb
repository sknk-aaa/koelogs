# frozen_string_literal: true

module Ai
  class UserLongTermProfileBuilder
    MAX_ITEMS = 4
    KEYWORD_WEIGHTS = {
      "喉" => :throat,
      "力み" => :throat,
      "息" => :breath,
      "不安定" => :stability,
      "外す" => :pitch,
      "音程" => :pitch,
      "高音" => :range,
      "裏声" => :register
    }.freeze
    POSITIVE_NOTE_PATTERNS = [
      [ "安定", "安定して出せる感覚がある" ],
      [ "改善", "改善の手応えが出てきている" ],
      [ "楽", "無理なく出せる感覚が増えている" ],
      [ "出しやす", "狙った声が出しやすくなっている" ],
      [ "繋が", "地声と裏声の接続が滑らかになってきている" ]
    ].freeze
    CHALLENGE_NOTE_PATTERNS = [
      [ "力み", "力みが出る場面がある" ],
      [ "詰ま", "喉が詰まりやすい場面がある" ],
      [ "外", "音程を外しやすい場面がある" ],
      [ "息", "息の支えが弱くなる場面がある" ],
      [ "不安定", "発声の安定度に波が出る日がある" ]
    ].freeze
    CHALLENGE_NOTE_KEYWORDS = %w[
      課題 限界 停滞 絞まり 詰まり 力み 大きくなってしま
      出しづら つなげ つなが
    ].freeze
    POSITIVE_NOTE_KEYWORDS = %w[
      安定 できた 出せた 維持 改善 伸びた
    ].freeze
    NOTE_REFERENCE_REGEX = /[A-G](?:#|b)?\d/

    def initialize(user:, window_days:)
      @user = user
      @window_days = window_days
    end

    def build(changed_sources:, previous_auto_profile: {})
      previous = normalize_profile(previous_auto_profile)

      logs_changed = changed_sources.include?(:training_logs) || changed_sources.include?(:monthly_logs)
      measurements_changed = changed_sources.include?(:measurements)
      settings_changed = changed_sources.include?(:settings)
      recompute_all = previous.empty?

      logs = logs_changed || recompute_all ? collect_logs : []
      monthly_logs = logs_changed || recompute_all ? collect_monthly_logs : []
      measurements = measurements_changed || recompute_all ? collect_measurements : {}

      strengths = if logs_changed || measurements_changed || settings_changed || recompute_all
                    build_strengths(logs, monthly_logs, measurements)
      else
                    previous["strengths"]
      end
      challenges = if logs_changed || measurements_changed || recompute_all
                     build_challenges(logs, monthly_logs, measurements)
      else
                     previous["challenges"]
      end
      failure_patterns = if logs_changed || recompute_all
                           build_failure_patterns(logs, monthly_logs)
      else
                           previous["failure_patterns"]
      end
      growth_journey = if logs_changed || measurements_changed || recompute_all
                         build_growth_journey(logs, monthly_logs, measurements)
      else
                         previous["growth_journey"]
      end

      {
        "strengths" => strengths,
        "challenges" => challenges,
        "failure_patterns" => failure_patterns,
        "growth_journey" => growth_journey,
        "custom_items" => Array(previous["custom_items"]).first(MAX_ITEMS)
      }
    end

    private

    attr_reader :user, :window_days

    def collect_logs
      from = window_days.days.ago.to_date
      user.training_logs
          .where(practiced_on: from..Date.current)
          .includes(:training_menus)
          .order(:practiced_on)
          .to_a
    end

    def collect_monthly_logs
      from_month = Date.current.beginning_of_month << 2
      user.monthly_logs.where(month_start: from_month..Date.current.beginning_of_month).order(:month_start).to_a
    end

    def collect_measurements
      from = window_days.days.ago.beginning_of_day
      runs = user.measurement_runs
                 .where(include_in_insights: true)
                 .where("recorded_at >= ?", from)
                 .includes(:long_tone_result, :pitch_accuracy_result, :volume_stability_result, :range_result)
                 .order(:recorded_at)
      {
        long_tone: runs.select { |r| r.measurement_type == "long_tone" && r.long_tone_result&.sustain_sec.present? }
                       .map { |r| r.long_tone_result.sustain_sec.to_f },
        pitch: runs.select { |r| r.measurement_type == "pitch_accuracy" && r.pitch_accuracy_result&.avg_cents_error.present? }
                   .map { |r| (r.pitch_accuracy_result.avg_cents_error.to_f / 100.0).abs },
        volume: runs.select { |r| r.measurement_type == "volume_stability" && r.volume_stability_result&.loudness_range_db.present? }
                    .map { |r| r.volume_stability_result.loudness_range_db.to_f.abs },
        range: runs.select { |r| r.measurement_type == "range" && r.range_result&.range_semitones.present? }
                   .map { |r| r.range_result.range_semitones.to_i.to_f }
      }
    end

    def build_strengths(logs, monthly_logs, measurements)
      items = []
      items.concat(extract_strength_sentences(logs, monthly_logs))
      items.concat(extract_note_patterns(logs, monthly_logs, POSITIVE_NOTE_PATTERNS))
      menu_counts = logs.flat_map(&:training_menus).group_by(&:name).transform_values(&:size)
      menu_counts.sort_by { |_name, count| -count }.first(1).each do |name, count|
        items << "#{name}を継続（#{count}回）"
      end
      items.concat(measurement_positive_points(measurements))
      fallback(items, "継続できている練習が増えています")
    end

    def build_challenges(logs, monthly_logs, measurements)
      items = []
      items.concat(extract_challenge_sentences(logs, monthly_logs))
      items.concat(extract_note_patterns(logs, monthly_logs, CHALLENGE_NOTE_PATTERNS))
      note_scores = keyword_scores(logs.map(&:notes).join("\n"))
      items << "喉まわりの力みが出やすい傾向" if note_scores[:throat].to_i >= 2
      items << "音程のばらつきに注意が必要" if note_scores[:pitch].to_i >= 2
      items.concat(measurement_negative_points(measurements))
      fallback(items, "負荷が高い日と低い日の波が出ています")
    end

    def build_failure_patterns(logs, monthly_logs)
      note_text = [ logs.map(&:notes), monthly_logs.map(&:notes) ].flatten.compact.join("\n")
      scores = keyword_scores(note_text)
      items = []
      items << "高音で息の支えが抜けやすい" if scores[:range].to_i + scores[:breath].to_i >= 2
      items << "喚声点付近で力みやすい" if scores[:register].to_i + scores[:throat].to_i >= 2
      items << "疲労時に音程の再現性が落ちやすい" if scores[:pitch].to_i >= 3
      fallback(items, "体調や時間帯で再現性がぶれやすい")
    end

    def build_growth_journey(logs, monthly_logs, measurements)
      items = []
      items.concat(extract_growth_sentences(logs, monthly_logs))
      items.concat(build_note_trend_points(logs, monthly_logs))
      if logs.size >= 2
        first = logs.first.duration_min.to_i
        last = logs.last.duration_min.to_i
        delta = last - first
        items << "練習時間は初期比 #{delta >= 0 ? '+' : ''}#{delta}分" if delta != 0
      end
      items.concat(measurement_growth_points(measurements))
      fallback(items, "基礎練習の再現性が少しずつ安定")
    end

    def measurement_positive_points(measurements)
      points = []
      points << "ロングトーンの持続が安定" if improving?(measurements[:long_tone], higher_is_better: true)
      points << "音程ズレの平均が縮小" if improving?(measurements[:pitch], higher_is_better: false)
      points << "音量レンジのばらつきが縮小" if improving?(measurements[:volume], higher_is_better: false)
      points << "可動音域が拡大傾向" if improving?(measurements[:range], higher_is_better: true)
      points
    end

    def extract_note_patterns(logs, monthly_logs, patterns)
      text = [ logs.map(&:notes), monthly_logs.map(&:notes) ].flatten.compact.join("\n")
      normalized = text.to_s
      items = patterns.filter_map do |keyword, sentence|
        next unless normalized.include?(keyword)

        sentence
      end
      items.first(2)
    end

    def extract_challenge_sentences(logs, monthly_logs)
      note_sentences(logs, monthly_logs).filter_map do |sentence|
        normalized = normalize_sentence(sentence)
        next if normalized.blank?
        next unless challenge_sentence?(normalized)

        normalized
      end.first(3)
    end

    def extract_strength_sentences(logs, monthly_logs)
      note_sentences(logs, monthly_logs).filter_map do |sentence|
        normalized = normalize_sentence(sentence)
        next if normalized.blank?
        next if future_or_problem_sentence?(normalized)
        next unless POSITIVE_NOTE_KEYWORDS.any? { |kw| normalized.include?(kw) }

        normalized
      end.first(2)
    end

    def extract_growth_sentences(logs, monthly_logs)
      note_sentences(logs, monthly_logs).filter_map do |sentence|
        normalized = normalize_sentence(sentence)
        next if normalized.blank?
        next if normalized.length < 10
        next unless normalized.match?(NOTE_REFERENCE_REGEX) || normalized.include?("前より") || normalized.include?("伸び")
        next if future_or_problem_sentence?(normalized) && !normalized.include?("改善")

        normalized
      end.first(2)
    end

    def note_sentences(logs, monthly_logs)
      raw = logs.reverse.map(&:notes) + monthly_logs.reverse.map(&:notes)
      raw.compact.flat_map { |text| text.to_s.split(/[。\n]/) }
    end

    def normalize_sentence(sentence)
      sentence.to_s.gsub(/\s+/, " ").strip.slice(0, 90)
    end

    def challenge_sentence?(sentence)
      CHALLENGE_NOTE_KEYWORDS.any? { |kw| sentence.include?(kw) } ||
        sentence.include?("したい") ||
        sentence.include?("ようになる")
    end

    def future_or_problem_sentence?(sentence)
      challenge_sentence?(sentence) ||
        sentence.include?("停滞") ||
        sentence.include?("限界")
    end

    def build_note_trend_points(logs, monthly_logs)
      notes = logs.map { |log| log.notes.to_s.strip }.reject(&:blank?)
      month_notes = monthly_logs.map { |log| log.notes.to_s.strip }.reject(&:blank?)
      all = notes + month_notes
      return [] if all.size < 2

      half = [ all.size / 2, 1 ].max
      early = all.first(half).join("\n")
      recent = all.last(half).join("\n")

      points = []
      if recent.scan("安定").size > early.scan("安定").size
        points << "自由記述では「安定」に関する記述が増えている"
      end
      if recent.scan("力み").size < early.scan("力み").size && early.scan("力み").size.positive?
        points << "自由記述では「力み」に関する悩みが減少傾向"
      end
      points.first(2)
    end

    def measurement_negative_points(measurements)
      points = []
      points << "ロングトーンの持続に波がある" if regressing?(measurements[:long_tone], higher_is_better: true)
      points << "音程ズレが増える日がある" if regressing?(measurements[:pitch], higher_is_better: false)
      points << "音量の安定度が乱れる日がある" if regressing?(measurements[:volume], higher_is_better: false)
      points
    end

    def measurement_growth_points(measurements)
      points = []
      if improved_amount(measurements[:long_tone], higher_is_better: true)
        delta = improved_amount(measurements[:long_tone], higher_is_better: true)
        points << "ロングトーンは初期比 #{delta >= 0 ? '+' : ''}#{format('%.1f', delta)}秒"
      end
      if improved_amount(measurements[:pitch], higher_is_better: false)
        delta = improved_amount(measurements[:pitch], higher_is_better: false)
        points << "平均音程ズレは #{format('%.2f', delta.abs)}半音改善"
      end
      points
    end

    def keyword_scores(text)
      scores = Hash.new(0)
      normalized = text.to_s
      KEYWORD_WEIGHTS.each do |keyword, key|
        scores[key] += normalized.scan(keyword).size
      end
      scores
    end

    def improving?(values, higher_is_better:)
      delta = improved_amount(values, higher_is_better: higher_is_better)
      return false if delta.nil?

      delta > 0
    end

    def regressing?(values, higher_is_better:)
      delta = improved_amount(values, higher_is_better: higher_is_better)
      return false if delta.nil?

      delta < 0
    end

    def improved_amount(values, higher_is_better:)
      arr = Array(values).compact
      return nil if arr.size < 2

      first = arr.first.to_f
      last = arr.last.to_f
      higher_is_better ? (last - first) : (first - last)
    end

    def fallback(items, message)
      cleaned = items.map(&:to_s).map(&:strip).reject(&:blank?).uniq.first(MAX_ITEMS)
      return cleaned if cleaned.any?

      [ message ]
    end

    def normalize_profile(raw)
      return {} unless raw.is_a?(Hash)

      {
        "strengths" => Array(raw["strengths"]).map(&:to_s),
        "challenges" => Array(raw["challenges"]).map(&:to_s),
        "failure_patterns" => Array(raw["failure_patterns"]).map(&:to_s),
        "growth_journey" => Array(raw["growth_journey"]).map(&:to_s),
        "custom_items" => Array(raw["custom_items"]).map do |item|
          {
            "title" => item.is_a?(Hash) ? item["title"].to_s : "",
            "content" => item.is_a?(Hash) ? item["content"].to_s : ""
          }
        end
      }
    end
  end
end
