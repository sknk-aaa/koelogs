module Api
  class MeController < ApplicationController
    before_action :require_login!

    def show
      render json: { id: current_user.id, email: current_user.email }
    end
  end
end
