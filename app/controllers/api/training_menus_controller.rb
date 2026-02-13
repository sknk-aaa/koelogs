# app/controllers/api/training_menus_controller.rb
module Api
  class TrainingMenusController < ApplicationController
    before_action :require_login!
    before_action :set_menu, only: [ :update ]

    # GET /api/training_menus
    # デフォルトは archived=false のみ
    # ?include_archived=true で全件取得
    def index
      menus = current_user.training_menus
      unless ActiveModel::Type::Boolean.new.cast(params[:include_archived])
        menus = menus.active
      end

      render json: {
        data: menus.order(:created_at).map { |m| serialize(m) }
      }
    end

    # POST /api/training_menus
    def create
      menu = current_user.training_menus.new(name: params[:name])

      if menu.save
        render json: { data: serialize(menu) }, status: :created
      else
        render json: { errors: menu.errors.full_messages }, status: :unprocessable_entity
      end
    end

    # PATCH /api/training_menus/:id
    # name変更 or archived切替
    def update
      if @menu.update(update_params)
        render json: { data: serialize(@menu) }
      else
        render json: { errors: @menu.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def set_menu
      @menu = current_user.training_menus.find(params[:id])
    end

    def update_params
      params.permit(:name, :archived)
    end

    def serialize(menu)
      {
        id: menu.id,
        name: menu.name,
        archived: menu.archived,
        created_at: menu.created_at.iso8601
      }
    end
  end
end
