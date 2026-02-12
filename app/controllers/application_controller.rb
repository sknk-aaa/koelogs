class ApplicationController < ActionController::API
  include ActionController::Cookies

  private

  def current_user
    return @current_user if defined?(@current_user)
    @current_user = User.find_by(id: session[:user_id])
  end

  def require_login!
    render json: { error: "unauthorized" }, status: :unauthorized if current_user.nil?
  end
end
