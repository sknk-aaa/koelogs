# frozen_string_literal: true

module ImprovementTagCatalog
  TAGS = [
    "high_note_ease",
    "range_breadth",
    "pitch_accuracy",
    "pitch_stability",
    "passaggio_smoothness",
    "less_breathlessness",
    "volume_stability",
    "less_throat_tension",
    "resonance_clarity",
    "long_tone_sustain"
  ].freeze

  LABELS = {
    "high_note_ease" => "高音の出しやすさ",
    "range_breadth" => "音域の広さ",
    "pitch_accuracy" => "音程精度",
    "pitch_stability" => "音程精度",
    "passaggio_smoothness" => "換声点の滑らかさ",
    "less_breathlessness" => "息切れしにくさ",
    "volume_stability" => "音量安定性",
    "less_throat_tension" => "喉の力み軽減",
    "resonance_clarity" => "声の抜け・響き",
    "long_tone_sustain" => "ロングトーン維持"
  }.freeze
end
