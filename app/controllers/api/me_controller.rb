module Api
  class MeController < ApplicationController
    before_action :require_login!

    def show
      render json: serialize_me(current_user)
    end

    def update
      # 既存の display_name 更新仕様を壊さず、goal_text も受け取れるようにする
      permitted = params.fetch(:me, {}).permit(
        :display_name,
        :goal_text,
        :ai_custom_instructions,
        :public_profile_enabled,
        :public_goal_enabled,
        :ranking_participation_enabled,
        :current_password,
        :password,
        :password_confirmation,
        :avatar_image_url,
        :avatar_icon,
        ai_improvement_tags: [],
        ai_response_style_prefs: [ :style_tone, :warmth, :energy, :emoji ]
      )
      raw_long_term_profile = params.dig(:me, :ai_long_term_profile)

      current_password = permitted.delete(:current_password).to_s
      password = permitted[:password].to_s

      if password.present? && !current_user.authenticate(current_password)
        return render json: { error: [ "現在のパスワードが正しくありません" ] }, status: :unprocessable_entity
      end

      if password.blank?
        permitted.delete(:password)
        permitted.delete(:password_confirmation)
      end

      ActiveRecord::Base.transaction do
        current_user.update!(permitted)
        if raw_long_term_profile.is_a?(ActionController::Parameters) || raw_long_term_profile.is_a?(Hash)
          normalized_overrides =
            if raw_long_term_profile.is_a?(ActionController::Parameters)
              raw_long_term_profile.to_unsafe_h
            else
              raw_long_term_profile
            end
          Ai::UserLongTermProfileManager.update_overrides!(user: current_user, overrides: normalized_overrides)
        end
      end

      render json: serialize_me(current_user)
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    def recalculate_ai_profile
      AiUserProfileRefreshJob.perform_later(current_user.id, true)
      render json: { ok: true }, status: :accepted
    end

    private

    def serialize_me(user)
      long_term_profile = Ai::UserLongTermProfileManager.effective_profile(user: user)
      user_custom_items =
        if user.ai_user_profile
          normalize_custom_items(Array(user.ai_user_profile.effective_overrides["custom_items"]))
        else
          []
        end
      {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_icon: user.avatar_icon,
        avatar_image_url: user.avatar_image_url,
        goal_text: user.goal_text,
        ai_custom_instructions: user.ai_custom_instructions,
        ai_improvement_tags: Array(user.ai_improvement_tags),
        ai_response_style_prefs: Ai::ResponseStylePreferences.normalize(user.ai_response_style_prefs),
        ai_long_term_profile: long_term_profile,
        ai_long_term_profile_user_custom_items: user_custom_items,
        public_profile_enabled: user.public_profile_enabled,
        public_goal_enabled: user.public_goal_enabled,
        ranking_participation_enabled: user.ranking_participation_enabled,
        beginner_missions_completed: beginner_missions_completed?(user),
        plan_tier: user.plan_tier,
        billing_cycle: user.billing_cycle,
        ai_contribution_count: user.ai_contribution_events.distinct.count(:ai_recommendation_id),
        created_at: user.created_at&.iso8601
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

    def beginner_missions_completed?(user)
      daily_log_done = user.training_logs.exists?
      goal_done = user.goal_text.present?
      ai_customization_done =
        user.ai_custom_instructions.present? ||
        Array(user.ai_improvement_tags).any? ||
        Ai::ResponseStylePreferences.customized?(user.ai_response_style_prefs)
      measurement_done = user.measurement_runs.exists?
      ai_recommendation_done = user.ai_recommendations.exists?

      daily_log_done && goal_done && ai_customization_done && measurement_done && ai_recommendation_done
    end
  end
end
