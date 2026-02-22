module Api
  class MeasurementsController < ApplicationController
    before_action :require_login!

    def index
      scope = current_user.measurement_runs.includes(:range_result, :long_tone_result, :volume_stability_result, :pitch_accuracy_result)
      include_in_insights = params[:include_in_insights]
      if include_in_insights.present?
        scope = scope.where(include_in_insights: ActiveModel::Type::Boolean.new.cast(include_in_insights))
      end
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
                         .includes(:range_result, :long_tone_result, :volume_stability_result, :pitch_accuracy_result)
                         .where(include_in_insights: true)
                         .latest_first
      latest_map = {}
      MeasurementRun::MEASUREMENT_TYPES.each do |kind|
        latest_map[kind] = rows.find { |r| r.measurement_type == kind }
      end

      render json: {
        data: {
          range: latest_map["range"] ? serialize(latest_map["range"]) : nil,
          long_tone: latest_map["long_tone"] ? serialize(latest_map["long_tone"]) : nil,
          volume_stability: latest_map["volume_stability"] ? serialize(latest_map["volume_stability"]) : nil,
          pitch_accuracy: latest_map["pitch_accuracy"] ? serialize(latest_map["pitch_accuracy"]) : nil
        }
      }, status: :ok
    end

    def create
      payload = create_params

      run = current_user.measurement_runs.new(
        measurement_type: payload[:measurement_type],
        recorded_at: payload[:recorded_at].presence || Time.current,
        include_in_insights: payload.key?(:include_in_insights) ? ActiveModel::Type::Boolean.new.cast(payload[:include_in_insights]) : true
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
        when "pitch_accuracy"
          attrs = normalize_pitch_accuracy_result(payload[:pitch_accuracy_result], run)
          run.create_pitch_accuracy_result!(attrs)
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

    def update
      run = current_user.measurement_runs.find(params[:id])
      payload = update_params
      run.include_in_insights = ActiveModel::Type::Boolean.new.cast(payload[:include_in_insights]) if payload.key?(:include_in_insights)
      run.save!
      render json: { data: serialize(run) }, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: "not found" }, status: :not_found
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages.presence || [ "invalid payload" ] }, status: :unprocessable_entity
    end

    private

    def create_params
      params.permit(
        :measurement_type,
        :recorded_at,
        :include_in_insights,
        range_result: [
          :lowest_note,
          :highest_note,
          :chest_top_note,
          :falsetto_top_note,
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
        ],
        pitch_accuracy_result: [
          :avg_cents_error,
          :accuracy_score,
          :note_count
        ]
      )
    end

    def update_params
      params.permit(:include_in_insights)
    end

    def serialize(run)
      {
        id: run.id,
        measurement_type: run.measurement_type,
        include_in_insights: run.include_in_insights,
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
          chest_top_note: r.chest_top_note,
          falsetto_top_note: r.falsetto_top_note,
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
          loudness_range_ratio: clamp_ratio_or_nil(decimal_or_nil(r.loudness_range_ratio)),
          loudness_range_pct: clamp_score_or_nil(decimal_or_nil(r.loudness_range_pct))
        }
      when "pitch_accuracy"
        r = run.pitch_accuracy_result
        return nil unless r

        {
          avg_cents_error: decimal_or_nil(r.avg_cents_error),
          accuracy_score: decimal_or_nil(r.accuracy_score),
          note_count: r.note_count
        }
      end
    end

    def decimal_or_nil(v)
      return nil if v.nil?

      v.to_f
    end

    def clamp_score_or_nil(v)
      return nil if v.nil?

      v.to_f.clamp(0.0, 100.0)
    end

    def clamp_ratio_or_nil(v)
      return nil if v.nil?

      v.to_f.clamp(0.0, 1.0)
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
        end

      pct =
        if attrs[:loudness_range_pct].present?
          attrs[:loudness_range_pct].to_f
        elsif ratio
          ratio * 100.0
        else
          # volume stability score (0..100): 100 - 12 * spread_db
          # fallback uses provided range_db when score is not explicitly sent.
          100.0 - (range_db * 12.0)
        end

      pct = pct.clamp(0.0, 100.0) if pct
      ratio = (pct / 100.0) if ratio.nil? && pct

      attrs[:avg_loudness_db] = avg
      attrs[:min_loudness_db] = min
      attrs[:max_loudness_db] = max
      attrs[:loudness_range_db] = range_db
      attrs[:loudness_range_ratio] = ratio
      attrs[:loudness_range_pct] = pct
      attrs
    end

    def normalize_pitch_accuracy_result(raw, run)
      attrs = (raw || {}).to_h.symbolize_keys
      if attrs[:avg_cents_error].blank? || attrs[:accuracy_score].blank?
        run.errors.add(:base, "pitch_accuracy_result requires avg_cents_error and accuracy_score")
        raise ActiveRecord::RecordInvalid, run
      end

      avg_cents = attrs[:avg_cents_error].to_f
      score = attrs[:accuracy_score].to_f.clamp(0.0, 100.0)
      note_count = attrs[:note_count].present? ? attrs[:note_count].to_i : nil

      attrs[:avg_cents_error] = avg_cents
      attrs[:accuracy_score] = score
      attrs[:note_count] = note_count
      attrs
    end
  end
end
