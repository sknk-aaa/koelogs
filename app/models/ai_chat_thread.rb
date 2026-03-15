# frozen_string_literal: true

class AiChatThread < ApplicationRecord
  SYSTEM_PROMPT_VERSION = "general-chat-v1"
  USER_PROMPT_VERSION = "general-chat-v1"
  MAX_MESSAGES = 80
  SOURCE_KINDS = %w[ai_recommendation].freeze

  belongs_to :user
  belongs_to :project,
             class_name: "AiChatProject",
             optional: true,
             inverse_of: :threads,
             foreign_key: :ai_chat_project_id
  has_many :messages,
           class_name: "AiChatMessage",
           inverse_of: :thread,
           dependent: :destroy,
           foreign_key: :ai_chat_thread_id

  validates :title, presence: true, length: { maximum: 120 }
  validates :llm_model_name, :system_prompt_version, :user_prompt_version, presence: true
  validates :last_message_at, presence: true
  validates :source_kind, inclusion: { in: SOURCE_KINDS }, allow_nil: true
  validate :source_date_required_for_recommendation

  before_validation :normalize_recommendation_source_date

  private

  def normalize_recommendation_source_date
    return unless source_kind == "ai_recommendation"
    return if source_date.blank?

    self.source_date = source_date.to_date.beginning_of_week(:monday)
  end

  def source_date_required_for_recommendation
    return unless source_kind == "ai_recommendation"
    return if source_date.present?

    errors.add(:source_date, "is required for ai_recommendation")
  end
end
