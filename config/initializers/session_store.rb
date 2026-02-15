# config/initializers/session_store.rb
Rails.application.config.session_store :cookie_store,
  key: "_voice_app_session",
  same_site: :lax,
  secure: Rails.env.production?
