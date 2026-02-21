module Api
  class AnalysisMenusController < ApplicationController
    before_action :require_login!

    SYSTEM_PRESETS = [
      {
        system_key: "falsetto_peak",
        name: "裏声最高音測定",
        focus_points: "裏声で無理なく最高音を測定する",
        compare_by_scale: true,
        compare_by_tempo: true,
        fixed_scale_type: nil,
        fixed_tempo: nil,
        selected_metrics: %w[peak_note pitch_accuracy pitch_stability]
      },
      {
        system_key: "chest_peak",
        name: "地声最高音測定",
        focus_points: "地声で無理なく最高音を測定する",
        compare_by_scale: true,
        compare_by_tempo: true,
        fixed_scale_type: nil,
        fixed_tempo: nil,
        selected_metrics: %w[peak_note pitch_accuracy pitch_stability]
      },
      {
        system_key: "range",
        name: "音域測定",
        focus_points: "最低音から最高音までの到達幅を測る",
        compare_by_scale: true,
        compare_by_tempo: true,
        fixed_scale_type: nil,
        fixed_tempo: nil,
        selected_metrics: %w[peak_note pitch_stability]
      },
      {
        system_key: "long_tone",
        name: "ロングトーン測定",
        focus_points: "一定音量・一定音程を維持して発声時間を測る",
        compare_by_scale: true,
        compare_by_tempo: true,
        fixed_scale_type: nil,
        fixed_tempo: nil,
        selected_metrics: %w[phonation_duration volume_stability pitch_stability]
      },
      {
        system_key: "pitch_accuracy",
        name: "音程正確性測定（固定）",
        focus_points: "選択した音源条件で半音中心への一致度を測る",
        compare_by_scale: true,
        compare_by_tempo: true,
        fixed_scale_type: nil,
        fixed_tempo: nil,
        selected_metrics: %w[pitch_accuracy pitch_stability]
      },
      {
        system_key: "volume_stability",
        name: "音量安定性測定（固定）",
        focus_points: "選択した音源条件で音量のばらつきを測る",
        compare_by_scale: true,
        compare_by_tempo: true,
        fixed_scale_type: nil,
        fixed_tempo: nil,
        selected_metrics: %w[volume_stability avg_loudness]
      }
    ].freeze

    def index
      ensure_system_presets!
      menus = current_user.analysis_menus
      unless ActiveModel::Type::Boolean.new.cast(params[:include_archived])
        menus = menus.active
      end

      render json: { data: menus.order(:created_at).map { |m| serialize(m) } }
    end

    def create
      render json: { errors: [ "analysis menu customization has been removed" ] }, status: :forbidden
    end

    def update
      render json: { errors: [ "analysis menu customization has been removed" ] }, status: :forbidden
    end

    private

    def ensure_system_presets!
      preset_keys = SYSTEM_PRESETS.map { |p| p[:system_key] }
      current_user.analysis_menus.where.not(system_key: preset_keys).destroy_all

      SYSTEM_PRESETS.each do |preset|
        existing = current_user.analysis_menus.find_by(system_key: preset[:system_key])
        if existing
          existing.update!(preset.merge(archived: false))
          next
        end

        current_user.analysis_menus.create!(preset)
      end
    end

    def serialize(menu)
      {
        id: menu.id,
        system_key: menu.system_key,
        name: menu.name,
        focus_points: menu.focus_points,
        compare_by_scale: menu.compare_by_scale,
        compare_by_tempo: menu.compare_by_tempo,
        fixed_scale_type: menu.fixed_scale_type,
        fixed_tempo: menu.fixed_tempo,
        selected_metrics: menu.selected_metrics,
        archived: menu.archived,
        created_at: menu.created_at.iso8601
      }
    end
  end
end
