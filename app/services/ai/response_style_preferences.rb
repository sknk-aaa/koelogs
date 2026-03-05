# frozen_string_literal: true

module Ai
  module ResponseStylePreferences
    STYLE_TONE_OPTIONS = %w[default professional friendly candid unique efficient curious cynical].freeze
    LEVEL_OPTIONS = %w[high default low].freeze

    DEFAULT_PREFS = {
      "style_tone" => "default",
      "warmth" => "default",
      "energy" => "default",
      "emoji" => "default"
    }.freeze

    STYLE_TONE_LABELS = {
      "default" => "デフォルト（標準）",
      "professional" => "プロフェッショナル（正確で端的）",
      "friendly" => "フレンドリー（親しみやすい）",
      "candid" => "率直（回りくどさを抑える）",
      "unique" => "個性的（表現に少し遊びを入れる）",
      "efficient" => "効率的（結論と手順を優先）",
      "curious" => "好奇心旺盛（深掘り質問をしやすい）",
      "cynical" => "シニカル（批判寄り・辛口）"
    }.freeze

    LEVEL_LABELS = {
      "high" => "多め",
      "default" => "デフォルト",
      "low" => "少なめ"
    }.freeze

    module_function

    def normalize(raw)
      hash = raw.is_a?(Hash) ? raw : {}

      style_tone = normalize_option(hash["style_tone"], STYLE_TONE_OPTIONS, DEFAULT_PREFS["style_tone"])
      warmth = normalize_option(hash["warmth"], LEVEL_OPTIONS, DEFAULT_PREFS["warmth"])
      energy = normalize_option(hash["energy"], LEVEL_OPTIONS, DEFAULT_PREFS["energy"])
      emoji = normalize_option(hash["emoji"], LEVEL_OPTIONS, DEFAULT_PREFS["emoji"])

      {
        "style_tone" => style_tone,
        "warmth" => warmth,
        "energy" => energy,
        "emoji" => emoji
      }
    end

    def customized?(raw)
      normalize(raw) != DEFAULT_PREFS
    end

    def summary_text(raw)
      prefs = normalize(raw)
      lines = []
      lines << "- style_tone: #{STYLE_TONE_LABELS[prefs["style_tone"]]}"
      lines << "- 温かみ: #{LEVEL_LABELS[prefs["warmth"]]}"
      lines << "- 熱量: #{LEVEL_LABELS[prefs["energy"]]}"
      lines << "- 絵文字: #{LEVEL_LABELS[prefs["emoji"]]}"
      lines.join("\n")
    end

    def prompt_rules(raw)
      prefs = normalize(raw)
      rules = []

      rules << style_tone_rule(prefs["style_tone"])
      rules << warmth_rule(prefs["warmth"])
      rules << energy_rule(prefs["energy"])
      rules << emoji_rule(prefs["emoji"])

      rules.compact
    end

    def normalize_option(value, allowed, fallback)
      candidate = value.to_s.strip
      allowed.include?(candidate) ? candidate : fallback
    end
    private_class_method :normalize_option

    def style_tone_rule(value)
      case value
      when "professional"
        "- 文体は正確・端的・落ち着いたトーンを優先する。"
      when "friendly"
        "- 文体は親しみやすく、柔らかい言い回しを優先する。"
      when "candid"
        "- 回りくどい前置きを減らし、率直に要点を伝える。"
      when "unique"
        "- 画一的すぎる表現を避け、軽い比喩や印象的な言い回しを許容する。"
      when "efficient"
        "- 結論→手順の順で、実行に必要な情報だけを先に示す。"
      when "curious"
        "- 必要に応じて1つだけ深掘り質問を添え、理解を深める。"
      when "cynical"
        "- 批判的な指摘は可だが、人格否定や高圧表現は使わない。"
      else
        nil
      end
    end
    private_class_method :style_tone_rule

    def warmth_rule(value)
      case value
      when "high"
        "- 共感や安心につながる短い一文を入れやすくする。"
      when "low"
        "- 共感表現は最小限にし、事実と手順中心で述べる。"
      else
        nil
      end
    end
    private_class_method :warmth_rule

    def energy_rule(value)
      case value
      when "high"
        "- 前向きな励まし表現を適度に使ってよい。"
      when "low"
        "- 感嘆表現や過度な鼓舞を抑え、静かなトーンで書く。"
      else
        nil
      end
    end
    private_class_method :energy_rule

    def emoji_rule(value)
      case value
      when "high"
        "- 絵文字は文脈に合う範囲で使ってよい（多用しすぎない）。"
      when "low"
        "- 絵文字は原則0〜1個に抑える。"
      else
        nil
      end
    end
    private_class_method :emoji_rule
  end
end
