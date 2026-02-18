# frozen_string_literal: true

module MenuCanonicalization
  class AliasStore
    def self.upsert!(normalized_name:, canonical_key:, confidence:, source:)
      return if normalized_name.blank? || canonical_key.blank?

      now = Time.current
      row = MenuAlias.find_or_initialize_by(normalized_name: normalized_name)

      if row.new_record?
        row.canonical_key = canonical_key
        row.confidence = confidence
        row.source = source
        row.first_seen_at = now
        row.last_seen_at = now
        row.save!
        return row
      end

      # manual の既存判断は最優先で維持
      if row.source == "manual"
        row.last_seen_at = now
        row.save!
        return row
      end

      incoming_conf = confidence.to_f
      if incoming_conf >= row.confidence.to_f || row.canonical_key.blank?
        row.canonical_key = canonical_key
        row.confidence = incoming_conf
        row.source = source
      end
      row.last_seen_at = now
      row.save!
      row
    end
  end
end
