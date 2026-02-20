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

    # community
    get "community/posts", to: "community_posts#index"
    post "community/posts", to: "community_posts#create"
    get "community/favorites", to: "community_posts#favorites"
    post "community/posts/:id/favorite", to: "community_posts#favorite"
    delete "community/posts/:id/favorite", to: "community_posts#unfavorite"
    get "community/rankings", to: "community_rankings#show"
    get "community/profiles/:id", to: "community_profiles#show"

    # auth
    post "auth/signup", to: "auth#signup"
    post "auth/login", to: "auth#login"
    post "auth/logout", to: "auth#logout"
    post "auth/password_reset_requests", to: "auth#password_reset_request"
    post "auth/password_resets", to: "auth#password_reset"

    # me
    get "me", to: "me#show"
    patch "me", to: "me#update"
  end
end
