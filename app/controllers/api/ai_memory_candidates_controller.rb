# frozen_string_literal: true

module Api
  class AiMemoryCandidatesController < ApplicationController
    before_action :require_login!

    # GET /api/me/ai_memory_candidates
    def index
      AiProfileMemoryCandidate.cleanup_expired!(user: current_user)

      rows = current_user.ai_profile_memory_candidates.pending_active.order(created_at: :desc).limit(20)
      render json: { data: rows.map { |row| serialize_candidate(row) } }, status: :ok
    end

    # PATCH /api/me/ai_memory_candidates/:id
    # body: { decision: "save"|"dismiss", destination?: "voice"|"profile" }
    def update
      AiProfileMemoryCandidate.cleanup_expired!(user: current_user)
      candidate = current_user.ai_profile_memory_candidates.find(params[:id])

      decision = params[:decision].to_s
      case decision
      when "save"
        candidate.save_to_long_term_profile!(destination: "voice")
      when "dismiss"
        candidate.dismiss!
      else
        return render json: { errors: [ "decision must be save or dismiss" ] }, status: :unprocessable_entity
      end

      profile = Ai::UserLongTermProfileManager.effective_profile(user: current_user)
      user_custom_items =
        if current_user.ai_user_profile
          normalize_custom_items(Array(current_user.ai_user_profile.effective_overrides["custom_items"]))
        else
          []
        end

      render json: {
        data: {
          candidate: serialize_candidate(candidate),
          ai_long_term_profile: profile,
          ai_long_term_profile_user_custom_items: user_custom_items
        }
      }, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: "not found" }, status: :not_found
    rescue ArgumentError => e
      render json: { errors: [ e.message ] }, status: :unprocessable_entity
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    private

    def serialize_candidate(candidate)
      {
        id: candidate.id,
        source_kind: candidate.source_kind,
        source_thread_id: candidate.source_thread_id,
        source_message_id: candidate.source_message_id,
        source_text: candidate.source_text,
        candidate_text: candidate.candidate_text,
        suggested_destination: candidate.suggested_destination,
        status: candidate.status,
        expires_at: candidate.expires_at&.iso8601,
        resolved_at: candidate.resolved_at&.iso8601,
        resolved_destination: candidate.resolved_destination,
        created_at: candidate.created_at&.iso8601
      }
    end

    def normalize_custom_items(items)
      Array(items).filter_map do |item|
        next unless item.is_a?(Hash)

        title = item["title"].to_s.strip
        content = item["content"].to_s.strip
        next if title.blank? || content.blank?

        { title: title.slice(0, 40), content: content.slice(0, 220) }
      end.first(6)
    end
  end
end
