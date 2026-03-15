module Api
  module Community
    class TopicCommentsController < ApplicationController
      before_action :require_login!

      # POST /api/community/topics/:topic_id/comments
      def create
        return if enforce_rate_limit!(
          key: "community:topic_comments:create",
          limit: 15,
          window: 5.minutes,
          message: "コメントの送信回数が多すぎます。しばらく待ってから再度お試しください。"
        )

        topic = CommunityTopic.published.find_by(id: params[:topic_id])
        return render json: { error: "not_found" }, status: :not_found if topic.nil?

        parent = params[:parent_id].present? ? topic.community_topic_comments.find_by(id: params[:parent_id]) : nil
        if params[:parent_id].present? && parent.nil?
          return render json: { errors: [ "parent_id is invalid" ] }, status: :unprocessable_entity
        end

        comment = topic.community_topic_comments.new(
          user: current_user,
          parent: parent,
          body: params[:body]
        )

        if comment.save
          topic.increment!(:comments_count)
          render json: { ok: true }, status: :created
        else
          render json: { errors: comment.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/community/topics/:topic_id/comments/:id
      def destroy
        topic = CommunityTopic.published.find_by(id: params[:topic_id])
        return render json: { error: "not_found" }, status: :not_found if topic.nil?

        comment = topic.community_topic_comments.find_by(id: params[:id], user_id: current_user.id)
        return render json: { error: "not_found" }, status: :not_found if comment.nil?

        deleted_count = 1 + comment.replies.count
        comment.destroy!
        topic.update!(comments_count: [ topic.comments_count - deleted_count, 0 ].max)

        render json: { ok: true }, status: :ok
      end
    end
  end
end
