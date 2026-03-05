# frozen_string_literal: true

class AiTokenUsage < ApplicationRecord
  FEATURES = %w[recommendation followup chat long_profile].freeze

  belongs_to :user

  validates :feature, presence: true
  validates :input_tokens, :output_tokens, :total_tokens, numericality: { greater_than_or_equal_to: 0 }
  validates :year_month, :used_at, presence: true
end
