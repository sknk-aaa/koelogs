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
      if current_user.free_plan? && source_kind != "ai_recommendation"
        return render_premium_required!("AIチャットの新規作成はプレミアムプランで解放されます")
      end
      source_date = begin
        Date.iso8601(params[:source_date].to_s)
      rescue ArgumentError, TypeError
        nil
      end
      if source_kind == "ai_recommendation" && source_date.nil?
        return render json: { errors: [ "source_date is required for ai_recommendation" ] }, status: :unprocessable_entity
      end
      source_date = normalize_recommendation_source_date(source_kind, source_date)

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

      if current_user.free_plan?
        if @thread.source_kind != "ai_recommendation"
          return render_premium_required!("AIチャットはプレミアムプランで解放されます")
        end

        if free_followup_limit_reached_for_thread?
          return render_premium_required!("おすすめへの質問は1つの今週おすすめにつき1回までです。プレミアムプランで回数無制限になります")
        end
      end

      if @thread.messages.count > (AiChatThread::MAX_MESSAGES - 2)
        return render json: { errors: [ "会話上限に達しました" ] }, status: :unprocessable_entity
      end

      user_message = @thread.messages.create!(role: "user", content: message_text)
      memory_decision = parse_memory_candidate_decision(message_text)
      if memory_decision
        decision_text = apply_memory_candidate_decision(memory_decision)
        assistant_message = @thread.messages.create!(role: "assistant", content: decision_text)
        assign_generated_thread_title!(message_text)
        @thread.last_message_at = Time.current
        @thread.save!

        return render json: {
          data: {
            thread: serialize_thread(@thread),
            user_message: serialize_message(user_message),
            assistant_message: serialize_message(assistant_message)
          }
        }, status: :created
      end

      created_candidate = Ai::ChatMemoryCandidateRecorder.record_from_message!(
        user: current_user,
        thread: @thread,
        user_message: user_message
      )
      response_text = Ai::GeneralChatResponder.call(
        user: current_user,
        thread: @thread,
        messages: @thread.messages.order(:created_at).last(12)
      )
      response_text = append_memory_candidate_prompt(response_text, created_candidate: created_candidate)
      assistant_message = @thread.messages.create!(role: "assistant", content: response_text.to_s.strip)
      assign_generated_thread_title!(message_text)
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

    def normalize_recommendation_source_date(source_kind, source_date)
      return source_date unless source_kind == "ai_recommendation" && source_date.present?

      source_date.beginning_of_week(:monday)
    end

    def serialize_message(message)
      {
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at.iso8601
      }
    end

    def free_followup_limit_reached_for_thread?
      @thread.messages.where(role: "user").exists?
    end

    def assign_generated_thread_title!(message_text)
      return unless @thread.title == "新しい会話"

      @thread.title = Ai::ChatThreadTitleGenerator.generate!(
        message_text: message_text,
        user: current_user
      )
    end

    def render_premium_required!(message)
      render json: { errors: [ message ], code: "premium_required" }, status: :payment_required
    end

    def parse_memory_candidate_decision(text)
      normalized = text.to_s.strip
      return nil if normalized.blank?
      corrected = parse_corrected_memory_decision(normalized)
      return corrected if corrected.present?

      compact = normalized.gsub(/\s+/, "")
      compact = compact.sub(/\A[・\-*]+/, "")
      return { action: "dismiss" } if compact.match?(/\A(?:スキップ|保存しない|見送り)\z/)

      return { action: "save", destination: "voice" } if compact.match?(/\A(?:保存|保存する)?[（(：:]?声に関して(?:へ保存|に保存)?[）)]?\z/)
      return { action: "save", destination: "voice" } if compact.include?("声に関して") && compact.include?("保存")

      return { action: "save" } if compact.match?(/\A(?:保存|保存する)\z/)

      nil
    end

    def parse_corrected_memory_decision(text)
      return nil unless text.start_with?("保存（訂正）") || text.start_with?("訂正保存")

      saved_text = text[/保存内容[:：]\s*([^\n]+)/, 1].to_s.strip
      section_label = text[/保存先[:：]\s*MEMORY\s*-\s*([^\n]+)/, 1].to_s.strip
      return nil if saved_text.blank?

      {
        action: "save_corrected",
        destination: "voice",
        corrected_text: saved_text,
        section_label: section_label
      }
    end

    def apply_memory_candidate_decision(decision)
      candidate = current_user.ai_profile_memory_candidates.pending_active.order(created_at: :desc).first
      return "現在、保存候補はありません。" if candidate.nil?

      case decision[:action]
      when "dismiss"
        candidate.dismiss!
        "保存候補をスキップしました。"
      when "save"
        destination = decision[:destination].presence || "voice"
        result = candidate.save_to_long_term_profile!(destination: destination)
        saved_text = result[:saved_text].to_s
        section_label = result[:profile_section_label].to_s.presence || "課題"
        lines = []
        lines << "ユーザーデータを更新しました。"
        lines << "保存内容：#{saved_text.presence || candidate.candidate_text}"
        lines << "保存先：MEMORY - #{section_label}"
        lines.join("\n")
      when "save_corrected"
        destination = decision[:destination].presence || "voice"
        result = candidate.save_corrected_to_long_term_profile!(
          destination: destination,
          corrected_text: decision[:corrected_text].to_s,
          section_label: decision[:section_label].to_s
        )
        saved_text = result[:saved_text].to_s
        section_label = result[:profile_section_label].to_s.presence || "課題"
        lines = []
        lines << "ユーザーデータを更新しました。"
        lines << "保存内容：#{saved_text.presence || candidate.candidate_text}"
        lines << "保存先：MEMORY - #{section_label}"
        lines.join("\n")
      else
        "保存候補の操作を受け取れませんでした。"
      end
    end

    def append_memory_candidate_prompt(base_text, created_candidate:)
      return base_text if created_candidate.nil?

      saved_text = created_candidate.preview_saved_text.to_s
      section_label = created_candidate.preview_profile_section_label.to_s.presence || "課題"
      prompt_lines = []
      prompt_lines << ""
      prompt_lines << "保存候補を検出しました。"
      prompt_lines << "保存内容：#{saved_text}"
      prompt_lines << "保存先：MEMORY - #{section_label}"

      [ base_text.to_s.strip, prompt_lines.join("\n") ].join("\n")
    end
  end
end
