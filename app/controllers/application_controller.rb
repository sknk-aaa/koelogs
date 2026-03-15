# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  include ActionController::Cookies
  include RateLimitable

  private

  def current_user
    return @current_user if defined?(@current_user)
    @current_user = User.find_by(id: session[:user_id])
  end

  def require_login!
    if current_user.nil?
      render json: { error: "unauthorized" }, status: :unauthorized
      nil
    end
  end
end
