module Api
  class CommunityPostsController < ApplicationController
    before_action :require_login!, only: [ :create, :favorites, :favorite, :unfavorite ]

    # GET /api/community/posts
    # public page (login optional)
    def index
      limit = params[:limit].presence&.to_i || 30
      limit = 30 if limit <= 0
      limit = 100 if limit > 100

      posts = CommunityPost
                .includes(:training_menu, :user)
                .where(published: true)
                .order(created_at: :desc)
                .limit(limit)

      if current_user && ActiveModel::Type::Boolean.new.cast(params[:mine_first])
        case_sql = "CASE WHEN community_posts.user_id = #{current_user.id.to_i} THEN 0 ELSE 1 END"
        posts = posts.reorder(Arel.sql("#{case_sql}, community_posts.created_at DESC"))
      end

      users = posts.map(&:user).uniq
      profile_map = users.each_with_object({}) do |user, memo|
        memo[user.id] = serialize_public_profile(user)
      end
      favorite_meta = build_favorite_meta(posts)

      render json: {
        data: posts.map { |post| serialize_post(post, profile_map: profile_map, favorite_meta: favorite_meta) }
      }, status: :ok
    end

    # GET /api/community/favorites
    def favorites
      limit = params[:limit].presence&.to_i || 50
      limit = 50 if limit <= 0
      limit = 100 if limit > 100

      posts = CommunityPost
                .joins(:community_post_favorites)
                .includes(:training_menu, :user)
                .where(published: true)
                .where(community_post_favorites: { user_id: current_user.id })
                .order("community_post_favorites.created_at DESC")
                .limit(limit)

      users = posts.map(&:user).uniq
      profile_map = users.each_with_object({}) do |user, memo|
        memo[user.id] = serialize_public_profile(user)
      end
      favorite_meta = build_favorite_meta(posts)

      render json: {
        data: posts.map { |post| serialize_post(post, profile_map: profile_map, favorite_meta: favorite_meta) }
      }, status: :ok
    end

    # POST /api/community/posts
    # body:
    # {
    #   training_menu_id: 1,
    #   improvement_tags: ["pitch_stability"],
    #   effect_level: 4,
    #   comment: "...",
    #   published: true
    # }
    def create
      menu = current_user.training_menus.find_by(id: create_params[:training_menu_id])
      return render json: { errors: [ "training_menu_id is invalid" ] }, status: :unprocessable_entity if menu.nil?

      effect_level = create_params[:effect_level].presence || 3

      post = current_user.community_posts.new(
        training_menu: menu,
        improvement_tags: create_params[:improvement_tags],
        effect_level: effect_level,
        comment: create_params[:comment],
        published: create_params.key?(:published) ? ActiveModel::Type::Boolean.new.cast(create_params[:published]) : true,
        practiced_on: create_params[:practiced_on]
      )

      if post.save
        rewards =
          if post.published
            Gamification::Awarder.call(
              user: current_user,
              grants: [ { rule_key: "community_post_published", source_type: "community_post", source_id: post.id } ]
            )
          end

        render json: {
          data: serialize_post(
            post,
            profile_map: { current_user.id => serialize_public_profile(current_user) },
            favorite_meta: { counts: { post.id => 0 }, mine: {} }
          ),
          rewards: rewards
        }, status: :created
      else
        render json: { errors: post.errors.full_messages }, status: :unprocessable_entity
      end
    end

    # POST /api/community/posts/:id/favorite
    def favorite
      post = CommunityPost.where(published: true).find_by(id: params[:id])
      return render json: { error: "not_found" }, status: :not_found if post.nil?

      CommunityPostFavorite.create_or_find_by!(user_id: current_user.id, community_post_id: post.id)
      render json: { ok: true }, status: :ok
    end

    # DELETE /api/community/posts/:id/favorite
    def unfavorite
      post = CommunityPost.where(published: true).find_by(id: params[:id])
      return render json: { error: "not_found" }, status: :not_found if post.nil?

      current_user.community_post_favorites.where(community_post_id: post.id).delete_all
      render json: { ok: true }, status: :ok
    end

    private

    def create_params
      params.permit(:training_menu_id, :effect_level, :comment, :published, :practiced_on, improvement_tags: [])
    end

    def serialize_post(post, profile_map:, favorite_meta:)
      {
        id: post.id,
        training_menu_id: post.training_menu_id,
        menu_name: post.training_menu&.name.to_s,
        canonical_key: post.canonical_key,
        improvement_tags: post.improvement_tags,
        effect_level: post.effect_level,
        comment: post.comment,
        published: post.published,
        practiced_on: post.practiced_on&.iso8601,
        created_at: post.created_at.iso8601,
        favorite_count: favorite_meta[:counts][post.id] || 0,
        favorited_by_me: favorite_meta[:mine][post.id] || false,
        user: profile_map[post.user_id]
      }
    end

    def build_favorite_meta(posts)
      ids = posts.map(&:id)
      return { counts: {}, mine: {} } if ids.empty?

      counts = CommunityPostFavorite.where(community_post_id: ids).group(:community_post_id).count

      mine =
        if current_user
          current_user.community_post_favorites.where(community_post_id: ids).pluck(:community_post_id).each_with_object({}) do |id, memo|
            memo[id] = true
          end
        else
          {}
        end

      { counts: counts, mine: mine }
    end

    def serialize_public_profile(user)
      return { public: false } unless user.public_profile_enabled

      progress = Gamification::Progress.summary_for(user)
      {
        public: true,
        user_id: user.id,
        display_name: user.display_name.presence || "User #{user.id}",
        avatar_icon: user.avatar_icon,
        avatar_image_url: user.avatar_image_url,
        level: progress[:level],
        streak_current_days: progress[:streak_current_days],
        total_xp: progress[:total_xp],
        badges: progress[:badges].select { |b| b[:unlocked] }.map { |b| b.slice(:key, :name, :icon_path) },
        goal_text: user.public_goal_enabled ? user.goal_text : nil
      }
    end
  end
end
