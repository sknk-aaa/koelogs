module Api
  class MeasurementsController < ApplicationController
    before_action :require_login!

    def index
      scope = current_user.measurement_runs.includes(:range_result, :long_tone_result, :volume_stability_result)
      if params[:measurement_type].present?
        scope = scope.where(measurement_type: params[:measurement_type].to_s)
      end
      if params[:days].present?
        days = params[:days].to_i
        scope = scope.where("recorded_at >= ?", days.days.ago.beginning_of_day) if days > 0
      end

      limit = params[:limit].to_i
      limit = 100 if limit <= 0
      limit = [ limit, 500 ].min

      rows = scope.latest_first.limit(limit)
      render json: { data: rows.map { |run| serialize(run) } }, status: :ok
    end

    def latest
      rows = current_user.measurement_runs
                         .includes(:range_result, :long_tone_result, :volume_stability_result)
                         .latest_first
      latest_map = {}
      MeasurementRun::MEASUREMENT_TYPES.each do |kind|
        latest_map[kind] = rows.find { |r| r.measurement_type == kind }
      end

      render json: {
        data: {
          range: latest_map["range"] ? serialize(latest_map["range"]) : nil,
          long_tone: latest_map["long_tone"] ? serialize(latest_map["long_tone"]) : nil,
          volume_stability: latest_map["volume_stability"] ? serialize(latest_map["volume_stability"]) : nil
        }
      }, status: :ok
    end

    def create
      payload = create_params

      run = current_user.measurement_runs.new(
        measurement_type: payload[:measurement_type],
        recorded_at: payload[:recorded_at].presence || Time.current
      )

      ActiveRecord::Base.transaction do
        run.save!

        case run.measurement_type
        when "range"
          attrs = normalize_range_result(payload[:range_result], run)
          run.create_range_result!(attrs)
        when "long_tone"
          attrs = normalize_long_tone_result(payload[:long_tone_result], run)
          run.create_long_tone_result!(attrs)
        when "volume_stability"
          attrs = normalize_volume_result(payload[:volume_stability_result], run)
          run.create_volume_stability_result!(attrs)
        else
          run.errors.add(:measurement_type, "is invalid")
          raise ActiveRecord::RecordInvalid, run
        end
      end

      run.reload
      render json: { data: serialize(run) }, status: :created
    rescue ActiveRecord::RecordInvalid => e
      msg = e.record.errors.full_messages.presence || run&.errors&.full_messages || [ "invalid measurement payload" ]
      render json: { errors: msg }, status: :unprocessable_entity
    end

    private

    def create_params
      params.permit(
        :measurement_type,
        :recorded_at,
        range_result: [
          :lowest_note,
          :highest_note,
          :range_semitones,
          :range_octaves
        ],
        long_tone_result: [
          :sustain_sec,
          :sustain_note
        ],
        volume_stability_result: [
          :avg_loudness_db,
          :min_loudness_db,
          :max_loudness_db,
          :loudness_range_db,
          :loudness_range_ratio,
          :loudness_range_pct
        ]
      )
    end

    def serialize(run)
      {
        id: run.id,
        measurement_type: run.measurement_type,
        recorded_at: run.recorded_at&.iso8601,
        created_at: run.created_at&.iso8601,
        result: serialize_result(run)
      }
    end

    def serialize_result(run)
      case run.measurement_type
      when "range"
        r = run.range_result
        return nil unless r

        {
          lowest_note: r.lowest_note,
          highest_note: r.highest_note,
          range_semitones: r.range_semitones,
          range_octaves: decimal_or_nil(r.range_octaves)
        }
      when "long_tone"
        r = run.long_tone_result
        return nil unless r

        {
          sustain_sec: decimal_or_nil(r.sustain_sec),
          sustain_note: r.sustain_note
        }
      when "volume_stability"
        r = run.volume_stability_result
        return nil unless r

        {
          avg_loudness_db: decimal_or_nil(r.avg_loudness_db),
          min_loudness_db: decimal_or_nil(r.min_loudness_db),
          max_loudness_db: decimal_or_nil(r.max_loudness_db),
          loudness_range_db: decimal_or_nil(r.loudness_range_db),
          loudness_range_ratio: decimal_or_nil(r.loudness_range_ratio),
          loudness_range_pct: decimal_or_nil(r.loudness_range_pct)
        }
      end
    end

    def decimal_or_nil(v)
      return nil if v.nil?

      v.to_f
    end

    def normalize_range_result(raw, run)
      attrs = (raw || {}).to_h.symbolize_keys
      if attrs[:lowest_note].blank? || attrs[:highest_note].blank?
        run.errors.add(:base, "range_result requires lowest_note and highest_note")
        raise ActiveRecord::RecordInvalid, run
      end

      if attrs[:range_semitones].blank? && attrs[:range_octaves].blank?
        run.errors.add(:base, "range_result requires range_semitones or range_octaves")
        raise ActiveRecord::RecordInvalid, run
      end

      attrs[:range_semitones] = attrs[:range_semitones].to_i if attrs[:range_semitones].present?
      if attrs[:range_octaves].blank? && attrs[:range_semitones].present?
        attrs[:range_octaves] = attrs[:range_semitones].to_f / 12.0
      end
      attrs
    end

    def normalize_long_tone_result(raw, run)
      attrs = (raw || {}).to_h.symbolize_keys
      if attrs[:sustain_sec].blank?
        run.errors.add(:base, "long_tone_result requires sustain_sec")
        raise ActiveRecord::RecordInvalid, run
      end
      attrs[:sustain_sec] = attrs[:sustain_sec].to_f
      attrs
    end

    def normalize_volume_result(raw, run)
      attrs = (raw || {}).to_h.symbolize_keys
      required = %i[avg_loudness_db min_loudness_db max_loudness_db]
      missing = required.select { |k| attrs[k].blank? }
      if missing.any?
        run.errors.add(:base, "volume_stability_result missing: #{missing.join(', ')}")
        raise ActiveRecord::RecordInvalid, run
      end

      avg = attrs[:avg_loudness_db].to_f
      min = attrs[:min_loudness_db].to_f
      max = attrs[:max_loudness_db].to_f
      range_db = attrs[:loudness_range_db].present? ? attrs[:loudness_range_db].to_f : (max - min)

      ratio =
        if attrs[:loudness_range_ratio].present?
          attrs[:loudness_range_ratio].to_f
        elsif avg.abs > 0.0001
          range_db / avg.abs
        end

      pct =
        if attrs[:loudness_range_pct].present?
          attrs[:loudness_range_pct].to_f
        elsif ratio
          ratio * 100.0
        end

      attrs[:avg_loudness_db] = avg
      attrs[:min_loudness_db] = min
      attrs[:max_loudness_db] = max
      attrs[:loudness_range_db] = range_db
      attrs[:loudness_range_ratio] = ratio
      attrs[:loudness_range_pct] = pct
      attrs
    end
  end
end
