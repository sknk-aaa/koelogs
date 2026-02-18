module Api
  class MeController < ApplicationController
    before_action :require_login!

    def show
      render json: serialize_me(current_user)
    end

    def update
      # 既存の display_name 更新仕様を壊さず、goal_text も受け取れるようにする
      permitted = params.fetch(:me, {}).permit(:display_name, :goal_text)

      if current_user.update(permitted)
        render json: serialize_me(current_user)
      else
        render json: { error: current_user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def serialize_me(user)
      {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        goal_text: user.goal_text,
        created_at: user.created_at&.iso8601
      }
    end
  end
end
