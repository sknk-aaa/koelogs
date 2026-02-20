class XpEvent < ApplicationRecord
  belongs_to :user

  validates :rule_key, presence: true
  validates :source_type, presence: true
  validates :source_id, presence: true
  validates :points, numericality: { only_integer: true, greater_than: 0 }

  validates :rule_key, uniqueness: { scope: [ :user_id, :source_type, :source_id ] }
end
