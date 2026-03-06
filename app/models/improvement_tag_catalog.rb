# frozen_string_literal: true

module ImprovementTagCatalog
  TAGS = [
    "chest_voice_strength",
    "falsetto_strength",
    "mixed_voice_stability",
    "vocal_cord_closure",
    "range_breadth",
    "pitch_accuracy",
    "volume_stability",
    "long_tone_sustain",
    "less_throat_tension",
    "less_throat_fatigue",
    "breath_control",
    "breath_sustain"
  ].freeze

  LABELS = {
    "chest_voice_strength" => "地声強化",
    "falsetto_strength" => "裏声強化",
    "mixed_voice_stability" => "ミドルボイス安定",
    "vocal_cord_closure" => "声帯閉鎖（声の芯）",
    "range_breadth" => "音域の広さ",
    "pitch_accuracy" => "音程精度",
    "volume_stability" => "音量安定性",
    "long_tone_sustain" => "ロングトーン維持",
    "less_throat_tension" => "喉の力み軽減",
    "less_throat_fatigue" => "喉の疲れ軽減",
    "breath_control" => "ブレスコントロール",
    "breath_sustain" => "息の持続"
  }.freeze
end
