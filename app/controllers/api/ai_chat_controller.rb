# frozen_string_literal: true

module Api
  class AiChatController < ApplicationController
    before_action :require_login!
    before_action :set_thread, only: [ :show_thread, :update_thread, :destroy_thread, :create_message ]

    # GET /api/ai_chat/projects
    def projects
      rows = current_user.ai_chat_projects.where(archived: false).order(created_at: :asc)
      render json: { data: rows.map { |project| serialize_project(project) } }, status: :ok
    end

    # POST /api/ai_chat/projects
    # body: { name: "..." }
    def create_project
      project = current_user.ai_chat_projects.new(name: params[:name].to_s.strip)
      if project.save
        render json: { data: serialize_project(project) }, status: :created
      else
        render json: { errors: project.errors.full_messages }, status: :unprocessable_entity
      end
    end

    # PATCH /api/ai_chat/projects/:id
    # body: { name: "..." }
    def update_project
      project = current_user.ai_chat_projects.find(params[:id])
      if project.update(name: params[:name].to_s.strip)
        render json: { data: serialize_project(project) }, status: :ok
      else
        render json: { errors: project.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ActiveRecord::RecordNotFound
      render json: { error: "not found" }, status: :not_found
    end

    # DELETE /api/ai_chat/projects/:id
    def destroy_project
      project = current_user.ai_chat_projects.find(params[:id])
      project.destroy!
      render json: { data: { id: project.id } }, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: "not found" }, status: :not_found
    end

    # GET /api/ai_chat/threads?project_id=1|none
    def threads
      scope = current_user.ai_chat_threads.includes(:project).order(last_message_at: :desc)
      project_id = params[:project_id].presence
      scope =
        if project_id == "none"
          scope.where(ai_chat_project_id: nil)
        elsif project_id.present?
          scope.where(ai_chat_project_id: project_id)
        else
          scope
        end

      render json: { data: scope.limit(100).map { |thread| serialize_thread(thread) } }, status: :ok
    end

    # POST /api/ai_chat/threads
    # body: {
    #   project_id: number | null,
    #   title?: string,
    #   seed_assistant_message?: string,
    #   source_kind?: "ai_recommendation",
    #   source_date?: "YYYY-MM-DD"
    # }
    def create_thread
      project = resolve_project_param(params[:project_id])
      title = params[:title].to_s.strip
      title = "新しい会話" if title.blank?
      seed_assistant_message = params[:seed_assistant_message].to_s.strip
      source_kind = params[:source_kind].presence
      source_date = begin
        Date.iso8601(params[:source_date].to_s)
      rescue ArgumentError, TypeError
        nil
      end

      thread = current_user.ai_chat_threads.new(
        project: project,
        title: title,
        llm_model_name: Gemini::Client::DEFAULT_MODEL,
        system_prompt_version: AiChatThread::SYSTEM_PROMPT_VERSION,
        user_prompt_version: AiChatThread::USER_PROMPT_VERSION,
        last_message_at: Time.current,
        source_kind: source_kind,
        source_date: source_date
      )

      if thread.save
        if seed_assistant_message.present?
          thread.messages.create!(role: "assistant", content: seed_assistant_message)
          thread.update!(last_message_at: Time.current)
        end
        render json: { data: serialize_thread(thread) }, status: :created
      else
        render json: { errors: thread.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ActiveRecord::RecordNotFound
      render json: { error: "project not found" }, status: :not_found
    end

    # GET /api/ai_chat/threads/:id
    def show_thread
      render json: {
        data: {
          thread: serialize_thread(@thread),
          messages: @thread.messages.order(:created_at).map { |m| serialize_message(m) }
        }
      }, status: :ok
    end

    # PATCH /api/ai_chat/threads/:id
    # body: { title?: string, project_id?: number | null }
    def update_thread
      attrs = {}
      title = params[:title]
      attrs[:title] = title.to_s.strip if !title.nil?
      if params.key?(:project_id)
        attrs[:project] = resolve_project_param(params[:project_id])
      end
      if attrs.empty?
        return render json: { errors: [ "no updatable params" ] }, status: :unprocessable_entity
      end

      if @thread.update(attrs)
        render json: { data: serialize_thread(@thread) }, status: :ok
      else
        render json: { errors: @thread.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ActiveRecord::RecordNotFound
      render json: { error: "project not found" }, status: :not_found
    end

    # DELETE /api/ai_chat/threads/:id
    def destroy_thread
      id = @thread.id
      @thread.destroy!
      render json: { data: { id: id } }, status: :ok
    end

    # POST /api/ai_chat/threads/:id/messages
    # body: { message: "..." }
    def create_message
      message_text = params[:message].to_s.strip
      if message_text.blank?
        return render json: { errors: [ "message is required" ] }, status: :unprocessable_entity
      end

      if message_text.length > 2000
        return render json: { errors: [ "message is too long (max 2000 chars)" ] }, status: :unprocessable_entity
      end

      if @thread.messages.count > (AiChatThread::MAX_MESSAGES - 2)
        return render json: { errors: [ "会話上限に達しました" ] }, status: :unprocessable_entity
      end

      user_message = @thread.messages.create!(role: "user", content: message_text)
      response_text = Ai::GeneralChatResponder.call(
        user: current_user,
        thread: @thread,
        messages: @thread.messages.order(:created_at).last(12)
      )
      assistant_message = @thread.messages.create!(role: "assistant", content: response_text.to_s.strip)
      if @thread.title == "新しい会話"
        @thread.title = message_text.tr("\n", " ").slice(0, 40)
      end
      @thread.last_message_at = Time.current
      @thread.save!

      render json: {
        data: {
          thread: serialize_thread(@thread),
          user_message: serialize_message(user_message),
          assistant_message: serialize_message(assistant_message)
        }
      }, status: :created
    rescue => e
      if e.is_a?(Ai::TokenUsageTracker::LimitExceededError)
        return render json: { errors: [ e.message ] }, status: :unprocessable_entity
      end
      if e.is_a?(Gemini::Error) && e.message.include?("timeout")
        return render json: { errors: [ "AI応答が混み合っています。少し時間をおいて再試行してください。" ] }, status: :unprocessable_entity
      end

      Rails.logger.error("[AI][GeneralChat] #{e.class}: #{e.message}\n#{e.backtrace&.first(20)&.join("\n")}")
      render json: { errors: [ "会話の生成に失敗しました" ] }, status: :internal_server_error
    end

    private

    def resolve_project_param(value)
      return nil if value.nil? || value.to_s.strip.empty?

      current_user.ai_chat_projects.find(value)
    end

    def set_thread
      @thread = current_user.ai_chat_threads.includes(:project).find(params[:id])
    rescue ActiveRecord::RecordNotFound
      render json: { error: "not found" }, status: :not_found
    end

    def serialize_project(project)
      {
        id: project.id,
        name: project.name,
        created_at: project.created_at.iso8601,
        updated_at: project.updated_at.iso8601
      }
    end

    def serialize_thread(thread)
      {
        id: thread.id,
        project_id: thread.ai_chat_project_id,
        project_name: thread.project&.name,
        title: thread.title,
        model_name: thread.llm_model_name,
        system_prompt_version: thread.system_prompt_version,
        user_prompt_version: thread.user_prompt_version,
        source_kind: thread.source_kind,
        source_date: thread.source_date&.iso8601,
        last_message_at: thread.last_message_at.iso8601,
        created_at: thread.created_at.iso8601
      }
    end

    def serialize_message(message)
      {
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at.iso8601
      }
    end
  end
end
