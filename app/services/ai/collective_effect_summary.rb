# frozen_string_literal: true

module Ai
  class CollectiveEffectSummary
    SCALE_TYPE_LABELS = {
      "five_tone" => "5トーン",
      "triad" => "トライアド",
      "one_half_octave" => "1.5オクターブ",
      "octave" => "オクターブ",
      "octave_repeat" => "オクターブリピート",
      "semitone" => "セミトーン",
      "other" => "その他"
    }.freeze

    def initialize(window_days: 90, min_count: 3, target_tags: nil)
      @window_days = window_days
      @min_count = min_count
      @target_tags = normalize_tags(target_tags)
    end

    # return:
    # {
    #   window_days: 90,
    #   min_count: 3,
    #   rows: [ { tag_key:, tag_label:, top_menus: [ { canonical_key:, display_label:, count: } ] } ]
    # }
    def build
      from = @window_days.days.ago
      posts = CommunityPost.where(published: true).where("community_posts.created_at >= ?", from)
      counts = Hash.new { |h, k| h[k] = Hash.new(0) }
      contributors = Hash.new { |h, k| h[k] = {} }
      scale_counts = Hash.new { |h, k| h[k] = Hash.new(0) }
      detail_samples = Hash.new { |h, k| h[k] = [] }
      keyword_counts = Hash.new { |h, k| h[k] = Hash.new(0) }
      pattern_counts = Hash.new { |h, k| h[k] = { improved: Hash.new(0), range: Hash.new(0), focus: Hash.new(0) } }

      posts.find_each do |post|
        canonical_key = post.canonical_key.to_s.presence || "unknown|unspecified"
        next if canonical_key.start_with?("unknown")

        tags = normalized_tags(post.improvement_tags)
        tags &= @target_tags if @target_tags.any?
        tags.each do |tag|
          counts[tag][canonical_key] += 1
          key = [ tag, canonical_key ]
          contributors[key][post.user_id] = true
          scale_label = scale_label_for(post)
          scale_counts[key][scale_label] += 1
          normalized_comment = normalize_comment(post.comment)
          if normalized_comment.present?
            detail_samples[key] << normalized_comment
            detail_samples[key] = detail_samples[key].first(3)
          end
          detail = extract_detail_parts(post.comment)
          detail[:keywords].each { |kw| keyword_counts[key][kw] += 1 }
          detail[:improved].each { |v| pattern_counts[key][:improved][v] += 1 }
          detail[:range].each { |v| pattern_counts[key][:range][v] += 1 }
          detail[:focus].each { |v| pattern_counts[key][:focus][v] += 1 }
        end
      end

      rows = counts.map do |tag, menu_count|
        sorted = menu_count
                 .select { |_canonical_key, count| count >= @min_count }
                 .sort_by { |(_canonical_key, count)| -count }
                 .first(3)
                 .map do |canonical_key, count|
          key = [ tag, canonical_key ]
          {
            canonical_key: canonical_key,
            display_label: MenuCanonicalization::RuleEngine.label_for_key(canonical_key),
            count: count,
            contributor_user_ids: contributors[key].keys,
            top_scales: scale_counts[key]
                          .sort_by { |_label, c| -c }
                          .first(3)
                          .map { |label, c| { label: label, count: c } },
            detail_samples: detail_samples[key].uniq.first(2),
            detail_keywords: keyword_counts[key]
                              .sort_by { |_kw, c| -c }
                              .first(4)
                              .map { |kw, c| { label: kw, count: c } },
            detail_patterns: {
              improved: pattern_counts[key][:improved].sort_by { |_text, c| -c }.first(2).map { |text, c| { text: text, count: c } },
              range: pattern_counts[key][:range].sort_by { |_text, c| -c }.first(2).map { |text, c| { text: text, count: c } },
              focus: pattern_counts[key][:focus].sort_by { |_text, c| -c }.first(2).map { |text, c| { text: text, count: c } }
            }
          }
        end
        next if sorted.empty?

        {
          tag_key: tag,
          tag_label: ImprovementTagCatalog::LABELS[tag] || tag,
          top_menus: sorted
        }
      end.compact

      {
        window_days: @window_days,
        min_count: @min_count,
        target_tags: @target_tags,
        rows: rows.sort_by { |r| -r[:top_menus].sum { |m| m[:count] } }
      }
    end

  private

    DETAIL_LINE_KEYS = [
      [ /\Aどこが良くなった？?\s*[:：]/, :improved ],
      [ /\A音域\s*[:：]/, :range ],
      [ /\A意識した点\s*[:：]/, :focus ],
      [ /\A意識したポイント\s*[:：]/, :focus ]
    ].freeze

    KEYWORD_STOPWORDS = %w[
      できる よう なっ なる した して する したら など です ます こと もの ため
      地声レンジ 換声点付近 裏声レンジ
    ].freeze

    def normalized_tags(raw_tags)
      Array(raw_tags)
        .map(&:to_s)
        .map(&:strip)
        .reject(&:blank?)
        .uniq
        .select { |tag| ImprovementTagCatalog::TAGS.include?(tag) }
    end

    def scale_label_for(post)
      used_scale_type = post.respond_to?(:used_scale_type) ? post.used_scale_type.to_s : ""
      return SCALE_TYPE_LABELS["other"] if used_scale_type.blank?

      if used_scale_type == "other"
        other = post.respond_to?(:used_scale_other_text) ? post.used_scale_other_text.to_s.strip : ""
        return other.present? ? "その他(#{other})" : SCALE_TYPE_LABELS["other"]
      end

      SCALE_TYPE_LABELS[used_scale_type] || SCALE_TYPE_LABELS["other"]
    end

    def normalize_comment(comment)
      text = comment.to_s.gsub(/\r\n?/, "\n").strip
      return nil if text.blank?

      text
    end

    def extract_detail_parts(comment)
      lines = comment.to_s.lines.map { |ln| ln.to_s.strip }.reject(&:blank?)
      raw = { improved: [], range: [], focus: [], other: [] }

      lines.each do |line|
        matched = false
        DETAIL_LINE_KEYS.each do |pattern, field|
          next unless pattern.match?(line)

          body = line.sub(pattern, "").strip
          add_fragments(raw[field], body)
          matched = true
          break
        end
        add_fragments(raw[:other], line) unless matched
      end

      if raw.values.all?(&:empty?)
        add_fragments(raw[:other], comment.to_s)
      end

      # 非テンプレ文は簡易ヒューリスティックで救済
      raw[:other].dup.each do |fragment|
        if guess_range_text?(fragment)
          raw[:range] << fragment
        elsif guess_focus_text?(fragment)
          raw[:focus] << fragment
        elsif guess_improved_text?(fragment)
          raw[:improved] << fragment
        end
      end

      {
        improved: raw[:improved].uniq.first(3),
        range: raw[:range].uniq.first(3),
        focus: raw[:focus].uniq.first(3),
        keywords: extract_keywords(raw)
      }
    end

    def add_fragments(target, text)
      text.to_s
          .split(%r{[、,，/・\n]+})
          .map { |v| v.to_s.strip }
          .reject(&:blank?)
          .each { |v| target << v.slice(0, 32) }
    end

    def extract_keywords(raw)
      source = raw.values.flatten
      source
        .flat_map { |t| t.split(%r{[、,，/・\s]+}) }
        .map { |w| w.to_s.strip }
        .reject { |w| w.blank? || w.length < 2 || KEYWORD_STOPWORDS.include?(w) }
        .first(12)
    end

    def guess_range_text?(text)
      text.match?(/地声|裏声|換声点|ミドル|レンジ|[A-G][#b]?\d/)
    end

    def guess_focus_text?(text)
      text.match?(/意識|喉|息|共鳴|鼻|声帯|力み|閉鎖|支え/)
    end

    def guess_improved_text?(text)
      text.match?(/良く|楽|安定|出せ|上が|伸び|改善/)
    end
  end
end
