module Api
  class MonthlyLogsController < ApplicationController
    before_action :require_login!

    # GET /api/monthly_logs?month=YYYY-MM
    def show
      month_start = parse_month_start!(params[:month])
      month_end = month_start.end_of_month
      log = current_user.monthly_logs.find_by(month_start: month_start)
      logs_scope = current_user.training_logs
                              .where(practiced_on: month_start..month_end)
                              .includes(:training_menus, :training_log_menus)
                              .order(practiced_on: :desc)

      render json: {
        data: {
          month: month_start.strftime("%Y-%m"),
          month_start: month_start.iso8601,
          month_end: month_end.iso8601,
          notes: log&.notes,
          summary: build_summary(month_start, month_end, logs_scope),
          daily_logs: logs_scope.map { |training_log| serialize_training_log(training_log) }
        }
      }, status: :ok
    rescue ArgumentError => e
      render json: { error: e.message }, status: :bad_request
    end

    # POST /api/monthly_logs
    # { month: "YYYY-MM", notes: "..." }
    def create
      month_start = parse_month_start!(create_params[:month])
      log = current_user.monthly_logs.find_or_initialize_by(month_start: month_start)
      was_new_record = log.new_record?
      log.notes = create_params[:notes].to_s.strip.presence

      if log.save
        rewards =
          if was_new_record
            Gamification::Awarder.call(
              user: current_user,
              grants: [ { rule_key: "monthly_log_saved", source_type: "monthly_log", source_id: log.id } ]
            )
          else
            nil
          end
        render json: {
          data: {
            id: log.id,
            month: month_start.strftime("%Y-%m"),
            month_start: month_start.iso8601,
            notes: log.notes,
            updated_at: log.updated_at&.iso8601
          },
          rewards: rewards
        }, status: :ok
      else
        render json: { errors: log.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ArgumentError => e
      render json: { errors: [ e.message ] }, status: :unprocessable_entity
    end

    private

    def create_params
      params.permit(:month, :notes)
    end

    def parse_month_start!(month)
      value = month.to_s.strip
      raise ArgumentError, "month is required. use YYYY-MM" if value.blank?
      raise ArgumentError, "invalid month format. use YYYY-MM" unless /\A\d{4}-\d{2}\z/.match?(value)

      Date.strptime("#{value}-01", "%Y-%m-%d").beginning_of_month
    rescue ArgumentError
      raise ArgumentError, "invalid month format. use YYYY-MM"
    end

    def build_summary(month_start, month_end, logs_scope)
      total_duration_min = logs_scope.sum("COALESCE(duration_min, 0)").to_i
      total_menu_count =
        TrainingLogMenu
          .joins(:training_log)
          .where(training_log_menus: { user_id: current_user.id })
          .where(training_logs: { practiced_on: month_start..month_end })
          .count
      menu_counts =
        TrainingLogMenu
          .joins(:training_log, :training_menu)
          .where(training_log_menus: { user_id: current_user.id })
          .where(training_logs: { practiced_on: month_start..month_end })
          .group("training_log_menus.training_menu_id", "training_menus.name", "training_menus.color")
          .select(
            "training_log_menus.training_menu_id AS menu_id",
            "training_menus.name AS name",
            "training_menus.color AS color",
            "COUNT(*) AS count"
          )
          .order(Arel.sql("COUNT(*) DESC"), "training_menus.name ASC")
          .map do |row|
            {
              menu_id: row.menu_id.to_i,
              name: row.name.to_s,
              color: row.color,
              count: row.count.to_i
            }
          end

      {
        total_duration_min: total_duration_min,
        total_menu_count: total_menu_count,
        menu_counts: menu_counts
      }
    end

    def serialize_training_log(log)
      menus_by_id = log.training_menus.index_by(&:id)
      ordered_menu_ids = log.training_log_menus.map(&:training_menu_id)
      ordered_menus = ordered_menu_ids.filter_map do |menu_id|
        menu = menus_by_id[menu_id]
        next if menu.nil?

        {
          id: menu.id,
          name: menu.name,
          color: menu.color,
          archived: menu.archived
        }
      end

      {
        id: log.id,
        practiced_on: log.practiced_on.iso8601,
        duration_min: log.duration_min,
        menus: ordered_menus,
        notes: log.notes,
        updated_at: log.updated_at&.iso8601
      }
    end
  end
end
