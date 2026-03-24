Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    frontend_origin = ENV["FRONTEND_ORIGIN"].to_s.strip
    allowed_origins = [ "http://localhost:5173", "http://127.0.0.1:5173" ]
    allowed_origins << frontend_origin if frontend_origin.present?

    origins(*allowed_origins)
    resource "*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      credentials: true
  end
end
