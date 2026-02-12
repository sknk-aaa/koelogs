Rails.application.routes.draw do
  namespace :api do
    get "scale_tracks", to: "scale_tracks#index"
    get "training_logs", to: "training_logs#index"

    # auth
    post "auth/signup", to: "auth#signup"
    post "auth/login",  to: "auth#login"
    post "auth/logout", to: "auth#logout"
    get  "me",          to: "me#show"
  end
end
