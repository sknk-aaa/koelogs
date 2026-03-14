module Api
  module Community
    class TopicsController < ApplicationController
      before_action :require_login!, only: [ :create, :update, :destroy, :like, :unlike ]

      # GET /api/community/topics
      def index
        per = params[:per].presence&.to_i || 20
        per = 20 if per <= 0
        per = 100 if per > 100
        page = params[:page].presence&.to_i || 1
        page = 1 if page <= 0

        topics = CommunityTopic
                   .published
                   .includes(:user)

        category = params[:category].to_s
        if category.present? && category != "all"
          topics = topics.where(category: category)
        end

        topics =
          if params[:sort].to_s == "popular"
            topics.order(likes_count: :desc, created_at: :desc)
          else
            topics.order(created_at: :desc)
          end

        rows = topics.offset((page - 1) * per).limit(per).to_a
        render json: {
          data: rows.map { |topic| serialize_topic_card(topic) },
          next_page: rows.length == per ? page + 1 : nil
        }, status: :ok
      end

      # GET /api/community/topics/:id
      def show
        topic = CommunityTopic
                  .published
                  .includes(:user, community_topic_comments: [ :user, :parent ])
                  .find_by(id: params[:id])
        return render json: { error: "not_found" }, status: :not_found if topic.nil?

        comments = topic.community_topic_comments.sort_by(&:created_at)
        roots = comments.select { |comment| comment.parent_id.nil? }
        replies_by_parent = comments.each_with_object(Hash.new { |hash, key| hash[key] = [] }) do |comment, memo|
          next if comment.parent_id.nil?

          memo[comment.parent_id] << comment
        end

        render json: {
          data: serialize_topic_detail(topic, roots:, replies_by_parent:)
        }, status: :ok
      end

      # POST /api/community/topics
      def create
        topic = current_user.community_topics.new(topic_params)

        if topic.save
          render json: { data: serialize_topic_card(topic) }, status: :created
        else
          render json: { errors: topic.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/community/topics/:id
      def update
        topic = current_user.community_topics.find_by(id: params[:id])
        return render json: { error: "not_found" }, status: :not_found if topic.nil?

        if topic.update(topic_params)
          render json: { data: serialize_topic_card(topic) }, status: :ok
        else
          render json: { errors: topic.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/community/topics/:id
      def destroy
        topic = current_user.community_topics.find_by(id: params[:id])
        return render json: { error: "not_found" }, status: :not_found if topic.nil?

        topic.destroy!
        render json: { ok: true }, status: :ok
      end

      # POST /api/community/topics/:id/like
      def like
        topic = CommunityTopic.published.find_by(id: params[:id])
        return render json: { error: "not_found" }, status: :not_found if topic.nil?

        like = CommunityTopicLike.create_or_find_by!(user_id: current_user.id, topic_id: topic.id)
        if like.previously_new_record?
          topic.increment!(:likes_count)
        end

        render json: { ok: true }, status: :ok
      end

      # DELETE /api/community/topics/:id/like
      def unlike
        topic = CommunityTopic.published.find_by(id: params[:id])
        return render json: { error: "not_found" }, status: :not_found if topic.nil?

        deleted = current_user.community_topic_likes.where(topic_id: topic.id).delete_all
        topic.decrement!(:likes_count) if deleted.positive? && topic.likes_count.positive?

        render json: { ok: true }, status: :ok
      end

      private

      def topic_params
        params.permit(:category, :title, :body, :published)
      end

      def serialize_topic_card(topic)
        {
          id: topic.id,
          user_id: topic.user_id,
          category: topic.category,
          title: topic.title,
          body: topic.body,
          body_preview: topic.body.to_s.tr("\n", " ").truncate(140),
          likes_count: topic.likes_count,
          comments_count: topic.comments_count,
          created_at: topic.created_at.iso8601,
          liked_by_me: current_user ? current_user.community_topic_likes.where(topic_id: topic.id).exists? : false,
          user: serialize_public_profile(topic.user)
        }
      end

      def serialize_topic_detail(topic, roots:, replies_by_parent:)
        {
          id: topic.id,
          user_id: topic.user_id,
          category: topic.category,
          title: topic.title,
          body: topic.body,
          likes_count: topic.likes_count,
          comments_count: topic.comments_count,
          created_at: topic.created_at.iso8601,
          liked_by_me: current_user ? current_user.community_topic_likes.where(topic_id: topic.id).exists? : false,
          user: serialize_public_profile(topic.user),
          comments: roots.map do |comment|
            serialize_comment(comment, replies: replies_by_parent[comment.id] || [])
          end
        }
      end

      def serialize_comment(comment, replies:)
        {
          id: comment.id,
          body: comment.body,
          created_at: comment.created_at.iso8601,
          can_delete: current_user&.id == comment.user_id,
          user: serialize_public_profile(comment.user),
          replies: replies.map do |reply|
            {
              id: reply.id,
              body: reply.body,
              created_at: reply.created_at.iso8601,
              can_delete: current_user&.id == reply.user_id,
              user: serialize_public_profile(reply.user)
            }
          end
        }
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
          level: progress[:level]
        }
      end
    end
  end
end
