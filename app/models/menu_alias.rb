class MenuAlias < ApplicationRecord
  SOURCE_VALUES = %w[rule ai manual].freeze

  before_validation :normalize_fields

  validates :normalized_name, presence: true, uniqueness: true
  validates :canonical_key, presence: true
  validates :confidence, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 }
  validates :source, inclusion: { in: SOURCE_VALUES }
  validates :first_seen_at, presence: true
  validates :last_seen_at, presence: true

  private

  def normalize_fields
    self.normalized_name = normalized_name.to_s.strip
    self.canonical_key = canonical_key.to_s.strip
    self.first_seen_at ||= Time.current
    self.last_seen_at ||= Time.current
  end
end
