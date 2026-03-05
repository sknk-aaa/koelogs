# frozen_string_literal: true

module Ai
  class ChatMemoryCandidateRecorder
    class << self
      def record_from_message!(user:, thread:, user_message:)
        AiProfileMemoryCandidate.cleanup_expired!(user: user)

        extracted = Ai::ChatMemoryCandidateExtractor.extract(user_message.content, user: user)
        return nil if extracted.blank?

        candidate_text = extracted[:candidate_text].to_s
        duplicate = user.ai_profile_memory_candidates
                        .where(status: "pending", candidate_text: candidate_text)
                        .where("created_at >= ?", 7.days.ago)
                        .exists?
        return nil if duplicate

        user.ai_profile_memory_candidates.create!(
          source_kind: "ai_chat",
          source_thread_id: thread.id,
          source_message_id: user_message.id,
          source_text: user_message.content.to_s,
          candidate_text: candidate_text,
          suggested_destination: extracted[:suggested_destination]
        )
      rescue => e
        Rails.logger.warn("[AI][ChatMemoryCandidateRecorder] #{e.class}: #{e.message}")
        nil
      end
    end
  end
end
