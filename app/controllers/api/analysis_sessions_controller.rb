require "fileutils"
require "securerandom"

module Api
  class AnalysisSessionsController < ApplicationController
    before_action :require_login!
    before_action :set_session, only: [ :destroy, :upload_audio ]
    AUDIO_UPLOAD_RELATIVE_DIR = File.join("uploads", "analysis_sessions").freeze
    SORTABLE_FIELDS = {
      "created_at" => "created_at",
      "pitch_stability_score" => "pitch_stability_score",
      "voice_consistency_score" => "voice_consistency_score",
      "range_semitones" => "range_semitones"
    }.freeze

    def index
      sessions = current_user.analysis_sessions.includes(:analysis_menu)
      if params[:analysis_menu_id].present?
        sessions = sessions.where(analysis_menu_id: params[:analysis_menu_id].to_i)
      end
      if params[:days].present?
        days = params[:days].to_i
        sessions = sessions.where("created_at >= ?", days.days.ago.beginning_of_day) if days > 0
      end
      if params[:tempo].present?
        tempo = params[:tempo].to_i
        sessions = sessions.where(recorded_tempo: tempo) if tempo > 0
      end
      if params[:q].present?
        q = "%#{params[:q].to_s.downcase.strip}%"
        sessions = sessions.where(
          "LOWER(COALESCE(peak_note, '')) LIKE :q OR LOWER(COALESCE(recorded_scale_type, '')) LIKE :q OR LOWER(COALESCE(feedback_text, '')) LIKE :q",
          q: q
        )
      end

      sort_key = SORTABLE_FIELDS[params[:sort_by].to_s] || "created_at"
      sort_dir = params[:sort_dir].to_s == "asc" ? "asc" : "desc"
      sessions = sessions.order(Arel.sql("#{sort_key} #{sort_dir}, id #{sort_dir}"))

      page = [ params[:page].to_i, 1 ].max
      per_page = params[:per_page].to_i
      per_page = 20 if per_page <= 0
      per_page = [ per_page, 100 ].min
      total_count = sessions.count
      total_pages = (total_count.to_f / per_page).ceil
      rows = sessions.offset((page - 1) * per_page).limit(per_page)

      render json: {
        data: rows.map { |s| serialize(s) },
        meta: {
          page: page,
          per_page: per_page,
          total_count: total_count,
          total_pages: total_pages
        }
      }, status: :ok
    end

    def create
      menu = current_user.analysis_menus.find(create_params[:analysis_menu_id])

      session = current_user.analysis_sessions.new(
        analysis_menu: menu,
        duration_sec: create_params[:duration_sec].to_i,
        peak_note: create_params[:peak_note],
        pitch_stability_score: create_params[:pitch_stability_score],
        voice_consistency_score: create_params[:voice_consistency_score],
        range_semitones: create_params[:range_semitones],
        recorded_scale_type: create_params[:recorded_scale_type],
        recorded_tempo: create_params[:recorded_tempo],
        raw_metrics: create_params[:raw_metrics].presence || {}
      )

      if session.save
        attach_ai_feedback!(session, menu)
        session.reload
        render json: { data: serialize(session) }, status: :created
      else
        render json: { errors: session.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ActiveRecord::RecordNotFound
      render json: { errors: [ "analysis_menu_id is invalid" ] }, status: :unprocessable_entity
    end

    def destroy
      @session.destroy!
      head :no_content
    end

    def upload_audio
      file = params[:audio]
      unless file.respond_to?(:read)
        render json: { errors: [ "audio is required" ] }, status: :unprocessable_entity
        return
      end

      ext = detect_extension(file)
      dir = Rails.root.join("public", AUDIO_UPLOAD_RELATIVE_DIR)
      FileUtils.mkdir_p(dir)
      filename = "#{SecureRandom.hex(16)}#{ext}"
      abs_path = dir.join(filename)
      File.binwrite(abs_path, file.read)

      relative_path = Pathname.new(abs_path).relative_path_from(Rails.root.join("public")).to_s
      @session.update!(
        audio_path: relative_path,
        audio_content_type: file.content_type.to_s.presence,
        audio_byte_size: File.size(abs_path)
      )

      render json: { data: serialize(@session) }, status: :ok
    rescue => e
      Rails.logger.error("[AnalysisSession] upload_audio failed: #{e.class}: #{e.message}")
      render json: { errors: [ "audio upload failed" ] }, status: :unprocessable_entity
    end

    private

    def create_params
      params.permit(
        :analysis_menu_id,
        :duration_sec,
        :peak_note,
        :pitch_stability_score,
        :voice_consistency_score,
        :range_semitones,
        :recorded_scale_type,
        :recorded_tempo,
        raw_metrics: {}
      )
    end

    def set_session
      @session = current_user.analysis_sessions.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      render json: { errors: [ "analysis_session not found" ] }, status: :not_found
    end

    def serialize(session)
      {
        id: session.id,
        analysis_menu_id: session.analysis_menu_id,
        analysis_menu_name: session.analysis_menu&.name,
        duration_sec: session.duration_sec,
        peak_note: session.peak_note,
        pitch_stability_score: session.pitch_stability_score,
        voice_consistency_score: session.voice_consistency_score,
        range_semitones: session.range_semitones,
        recorded_scale_type: session.recorded_scale_type,
        recorded_tempo: session.recorded_tempo,
        audio_url: session.audio_url.present? ? "#{request.base_url}#{session.audio_url}" : nil,
        has_audio: session.audio_path.present?,
        feedback_text: session.feedback_text,
        ai_feedback: extract_ai_feedback(session.raw_metrics),
        raw_metrics: session.raw_metrics,
        created_at: session.created_at.iso8601
      }
    end

    def detect_extension(file)
      content_type = file.content_type.to_s.downcase
      return ".m4a" if content_type.include?("mp4") || content_type.include?("m4a")
      return ".mp3" if content_type.include?("mpeg") || content_type.include?("mp3")
      return ".ogg" if content_type.include?("ogg")
      return ".wav" if content_type.include?("wav")

      ext = File.extname(file.original_filename.to_s)
      return ext if ext.present?

      ".webm"
    end

    def attach_ai_feedback!(session, menu)
      result = Ai::AnalysisFeedbackGenerator.new.generate!(
        menu_name: menu.name,
        focus_points: menu.focus_points,
        selected_metrics: menu.selected_metrics,
        metrics: {
          duration_sec: session.duration_sec,
          peak_note: session.peak_note,
          pitch_stability_score: session.pitch_stability_score || 0,
          pitch_accuracy_score: session.raw_metrics["pitch_accuracy_score"],
          volume_stability_score: session.raw_metrics["volume_stability_score"],
          phonation_duration_sec: session.raw_metrics["phonation_duration_sec"],
          avg_loudness_db: session.raw_metrics["avg_loudness_db"]
        }
      )
      raw = session.raw_metrics.is_a?(Hash) ? session.raw_metrics.deep_dup : {}
      raw["ai_feedback"] = result[:feedback_json] if result[:feedback_json].present?
      session.update_columns(
        feedback_text: result[:feedback_text].to_s.strip.presence,
        raw_metrics: raw
      )
    rescue Gemini::Error => e
      Rails.logger.error("[Gemini Analysis] #{e.message} status=#{e.status} body=#{e.body}")
    rescue => e
      Rails.logger.error("[AI Analysis] #{e.class}: #{e.message}")
    end

    def extract_ai_feedback(raw_metrics)
      return nil unless raw_metrics.is_a?(Hash)

      payload = raw_metrics["ai_feedback"] || raw_metrics[:ai_feedback]
      payload.is_a?(Hash) ? payload : nil
    end
  end
end
