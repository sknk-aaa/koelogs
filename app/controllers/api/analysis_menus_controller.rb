module Api
  class AnalysisMenusController < ApplicationController
    before_action :require_login!
    before_action :set_menu, only: [ :update ]

    def index
      menus = current_user.analysis_menus
      unless ActiveModel::Type::Boolean.new.cast(params[:include_archived])
        menus = menus.active
      end

      render json: { data: menus.order(:created_at).map { |m| serialize(m) } }
    end

    def create
      name = create_params[:name].to_s.strip
      focus_points = create_params[:focus_points]
      compare_by_scale = create_params[:compare_by_scale]
      compare_by_tempo = create_params[:compare_by_tempo]
      fixed_scale_type = create_params[:fixed_scale_type]
      fixed_tempo = create_params[:fixed_tempo]
      selected_metrics = create_params[:selected_metrics]

      existing =
        if name.present?
          current_user.analysis_menus.where("lower(name) = lower(?)", name).first
        end

      if existing
        if existing.archived
          existing.assign_attributes(
            name: name,
            archived: false,
            focus_points: focus_points.presence || existing.focus_points,
            compare_by_scale: compare_by_scale.nil? ? existing.compare_by_scale : compare_by_scale,
            compare_by_tempo: compare_by_tempo.nil? ? existing.compare_by_tempo : compare_by_tempo,
            fixed_scale_type: fixed_scale_type.nil? ? existing.fixed_scale_type : fixed_scale_type,
            fixed_tempo: fixed_tempo.nil? ? existing.fixed_tempo : fixed_tempo,
            selected_metrics: selected_metrics.nil? ? existing.selected_metrics : selected_metrics
          )

          if existing.save
            render json: { data: serialize(existing) }, status: :ok
          else
            render json: { errors: existing.errors.full_messages }, status: :unprocessable_entity
          end
          return
        end

        render json: { errors: [ "Name has already been taken" ] }, status: :unprocessable_entity
        return
      end

      menu = current_user.analysis_menus.new(create_params)
      if menu.save
        render json: { data: serialize(menu) }, status: :created
      else
        render json: { errors: menu.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @menu.update(update_params)
        render json: { data: serialize(@menu) }
      else
        render json: { errors: @menu.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def set_menu
      @menu = current_user.analysis_menus.find(params[:id])
    end

    def create_params
      params.permit(:name, :focus_points, :compare_by_scale, :compare_by_tempo, :fixed_scale_type, :fixed_tempo, selected_metrics: [])
    end

    def update_params
      params.permit(:name, :focus_points, :compare_by_scale, :compare_by_tempo, :fixed_scale_type, :fixed_tempo, :archived, selected_metrics: [])
    end

    def serialize(menu)
      {
        id: menu.id,
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
