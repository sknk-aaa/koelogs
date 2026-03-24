# config/initializers/session_store.rb
session_same_site =
  if Rails.env.production?
    :none
  else
    :lax
  end

Rails.application.config.session_store :cookie_store,
  key: "_voice_app_session",
  same_site: session_same_site,
  secure: Rails.env.production?,
  httponly: true
