# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    get "scale_tracks", to: "scale_tracks#index"

    # training logs
    get "training_logs", to: "training_logs#index"
    post "training_logs", to: "training_logs#create"
    get "monthly_logs", to: "monthly_logs#show"
    get "monthly_logs/comparison", to: "monthly_logs#comparison"
    post "monthly_logs", to: "monthly_logs#create"

    # training menus
    resources :training_menus, only: [ :index, :create, :update ]
    resources :measurements, only: [ :index, :create, :update ] do
      collection do
        get :latest
      end
    end

    # insights
    get "insights", to: "insights#show"
    get "missions", to: "missions#show"
    post "help/contact", to: "help_contacts#create"

    # ✅ AI recommendations
    get "ai_recommendations", to: "ai_recommendations#show"
    get "ai_recommendations/history", to: "ai_recommendations#history"
    post "ai_recommendations", to: "ai_recommendations#create"
    get "ai_recommendations/:id/thread", to: "ai_recommendation_threads#show"
    post "ai_recommendations/:id/thread/messages", to: "ai_recommendation_threads#create_message"
    get "ai_chat/projects", to: "ai_chat#projects"
    post "ai_chat/projects", to: "ai_chat#create_project"
    patch "ai_chat/projects/:id", to: "ai_chat#update_project"
    delete "ai_chat/projects/:id", to: "ai_chat#destroy_project"
    get "ai_chat/threads", to: "ai_chat#threads"
    post "ai_chat/threads", to: "ai_chat#create_thread"
    get "ai_chat/threads/:id", to: "ai_chat#show_thread"
    patch "ai_chat/threads/:id", to: "ai_chat#update_thread"
    delete "ai_chat/threads/:id", to: "ai_chat#destroy_thread"
    post "ai_chat/threads/:id/messages", to: "ai_chat#create_message"

    # community
    get "community/posts", to: "community_posts#index"
    post "community/posts", to: "community_posts#create"
    patch "community/posts/:id", to: "community_posts#update"
    delete "community/posts/:id", to: "community_posts#destroy"
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
    get "me/ai_memory_candidates", to: "ai_memory_candidates#index"
    patch "me/ai_memory_candidates/:id", to: "ai_memory_candidates#update"
  end
end
