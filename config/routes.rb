Rails.application.routes.draw do
  namespace :api do
    get "scale_tracks", to: "scale_tracks#index"

    # training logs
    get  "training_logs", to: "training_logs#index"
    post "training_logs", to: "training_logs#create"

    # auth
    post "auth/signup", to: "auth#signup"
    post "auth/login",  to: "auth#login"
    post "auth/logout", to: "auth#logout"
    get  "me",          to: "me#show"
  end
end
