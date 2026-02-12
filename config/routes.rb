Rails.application.routes.draw do
  namespace :api do
    get "scale_tracks", to: "scale_tracks#index"
  end
  namespace :api do
    get "training_logs", to: "training_logs#index"
  end
end
