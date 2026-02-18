# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    get "scale_tracks", to: "scale_tracks#index"

    # training logs
    get "training_logs", to: "training_logs#index"
    post "training_logs", to: "training_logs#create"
    get "weekly_logs", to: "weekly_logs#show"
    post "weekly_logs", to: "weekly_logs#create"

    # training menus
    resources :training_menus, only: [ :index, :create, :update ]
    resources :analysis_menus, only: [ :index, :create, :update ]
    resources :analysis_sessions, only: [ :index, :create, :destroy ] do
      member do
        post :upload_audio
      end
    end

    # insights
    get "insights", to: "insights#show"

    # ✅ AI recommendations
    get "ai_recommendations", to: "ai_recommendations#show"
    post "ai_recommendations", to: "ai_recommendations#create"

    # auth
    post "auth/signup", to: "auth#signup"
    post "auth/login", to: "auth#login"
    post "auth/logout", to: "auth#logout"

    # me
    get "me", to: "me#show"
    patch "me", to: "me#update"
  end
end
