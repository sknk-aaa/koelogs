Rails.application.routes.draw do
  namespace :api do
    get "scale_tracks", to: "scale_tracks#index"
  end
end
