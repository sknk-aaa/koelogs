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

      render json: { data: menus.order(:created_at).map { |m| serialize(m) } }
    end

    # POST /api/training_menus
    #
    # 仕様：
    # - 同名の archived=true が存在する場合 → それを復活（archived=false）して返す（colorも更新）
    # - 同名の archived=false が存在する場合 → 重複として 422
    def create
      name = create_params[:name].to_s.strip
      color = create_params[:color]

      # name が空なら通常の validation に任せる（分岐を簡単に）
      existing =
        if name.present?
          current_user.training_menus.where("lower(name) = lower(?)", name).first
        end

      if existing
        if existing.archived
          # ✅ 復活：色も今回指定があれば更新（未指定なら既存維持）
          existing.assign_attributes(
            name: name,
            archived: false,
            color: color.presence || existing.color
          )

          if existing.save
            canonicalize_menu(existing)
            render json: { data: serialize(existing) }, status: :ok
          else
            render json: { errors: existing.errors.full_messages }, status: :unprocessable_entity
          end
          return
        else
          # 既に active で存在 → 重複
          render json: { errors: [ "Name has already been taken" ] }, status: :unprocessable_entity
          return
        end
      end

      menu = current_user.training_menus.new(create_params)
      if menu.save
        canonicalize_menu(menu)
        render json: { data: serialize(menu) }, status: :created
      else
        render json: { errors: menu.errors.full_messages }, status: :unprocessable_entity
      end
    end

    # PATCH /api/training_menus/:id
    # name変更 or archived切替 or color変更
    def update
      if @menu.update(update_params)
        canonicalize_menu(@menu) if @menu.previous_changes.key?("name")
        render json: { data: serialize(@menu) }
      else
        render json: { errors: @menu.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def set_menu
      @menu = current_user.training_menus.find(params[:id])
    end

    def create_params
      params.permit(:name, :color)
    end

    def update_params
      params.permit(:name, :archived, :color)
    end

    def serialize(menu)
      {
        id: menu.id,
        name: menu.name,
        color: menu.color,
        archived: menu.archived,
        canonical_core_key: menu.canonical_core_key,
        canonical_register: menu.canonical_register,
        canonical_key: menu.canonical_key,
        canonical_confidence: menu.canonical_confidence.to_f,
        canonical_source: menu.canonical_source,
        canonical_version: menu.canonical_version,
        created_at: menu.created_at.iso8601
      }
    end

    def canonicalize_menu(menu)
      MenuCanonicalization::Apply.call(training_menu: menu)
      menu.reload
    rescue => e
      Rails.logger.error("[MenuCanonicalization] #{e.class}: #{e.message}")
    end
  end
end
