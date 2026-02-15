module Api
  class MeController < ApplicationController
    before_action :require_login!

    def show
      render json: me_json
    end

    # PATCH /api/me
    def update
      current_user.update!(me_params)
      render json: me_json
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    private

    def me_params
      params.require(:me).permit(:display_name)
    end

    def me_json
      {
        id: current_user.id,
        email: current_user.email,
        display_name: current_user.display_name
      }
    end
  end
end
