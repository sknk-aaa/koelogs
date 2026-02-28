# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

module Gemini
  class Error < StandardError
    attr_reader :status, :body

    def initialize(message, status: nil, body: nil)
      super(message)
      @status = status
      @body = body
    end
  end

  class Client
    BASE_URL = "https://generativelanguage.googleapis.com"
    API_VER  = "/v1beta"
    DEFAULT_MODEL = "gemini-2.5-flash"

    def initialize(api_key: ENV["GEMINI_API_KEY"], model: DEFAULT_MODEL, timeout_sec: 20)
      @api_key = api_key
      @model = model
      @timeout_sec = timeout_sec
      raise Error, "GEMINI_API_KEY is not set" if @api_key.nil? || @api_key.strip.empty?
    end

    def model_name
      @model
    end

    # return String (generated text)
    def generate_text!(user_text:, system_text:, max_output_tokens: 600, temperature: 0.7, user: nil, feature: nil, web_search: false)
      result = generate_text_with_usage!(
        user_text: user_text,
        system_text: system_text,
        max_output_tokens: max_output_tokens,
        temperature: temperature,
        user: user,
        feature: feature,
        web_search: web_search
      )
      result[:text]
    end

    # return Hash { text:, input_tokens:, output_tokens:, total_tokens: }
    def generate_text_with_usage!(user_text:, system_text:, max_output_tokens: 600, temperature: 0.7, user: nil, feature: nil, web_search: false)
      if user.present?
        Ai::TokenUsageTracker.ensure_within_limit!(user: user)
      end

      uri = URI("#{BASE_URL}#{API_VER}/models/#{@model}:generateContent")

      req_body = {

        systemInstruction: {
          parts: [ { text: system_text } ]
        },
        contents: [
          {
            role: "user",
            parts: [ { text: user_text } ]
          }
        ],
        generationConfig: {
          maxOutputTokens: max_output_tokens,
          temperature: temperature
        }
      }
      req_body[:tools] = [ { googleSearch: {} } ] if web_search

      status, body = post_json(uri, req_body)
      if (status < 200 || status >= 300) && web_search
        Rails.logger.warn("[Gemini::Client] web_search_fallback status=#{status}")
        req_body.delete(:tools)
        status, body = post_json(uri, req_body)
      end
      if status < 200 || status >= 300
        raise Error.new("Gemini API error (status=#{status})", status: status, body: body)
      end

      json = JSON.parse(body)
      parts = json.dig("candidates", 0, "content", "parts")
      text =
        if parts.is_a?(Array)
          parts.filter_map { |p| p.is_a?(Hash) ? p["text"].to_s : nil }.join
        else
          json.dig("candidates", 0, "content", "parts", 0, "text")
        end

      if text.nil? || text.strip.empty?
        raise Error.new("Gemini API returned empty text", status: status, body: body)
      end

      usage = parse_usage_metadata(json)
      if user.present? && feature.present?
        Ai::TokenUsageTracker.record!(
          user: user,
          feature: feature,
          usage: usage,
          llm_model_name: @model
        )
      end

      {
        text: text,
        input_tokens: usage[:input_tokens],
        output_tokens: usage[:output_tokens],
        total_tokens: usage[:total_tokens],
        sources: parse_sources(json)
      }
    rescue Net::ReadTimeout, Net::OpenTimeout => e
      raise Error.new("Gemini API timeout: #{e.class}")
    rescue JSON::ParserError
      raise Error.new("Gemini API returned non-JSON response", status: status, body: body)
    end

    private

    def parse_usage_metadata(json)
      usage = json["usageMetadata"].is_a?(Hash) ? json["usageMetadata"] : {}
      input = usage["promptTokenCount"].to_i
      output = usage["candidatesTokenCount"].to_i
      total = usage["totalTokenCount"].to_i
      if total <= 0
        total = input + output
      end
      {
        input_tokens: input.negative? ? 0 : input,
        output_tokens: output.negative? ? 0 : output,
        total_tokens: total.negative? ? 0 : total
      }
    end

    def parse_sources(json)
      candidate = json.dig("candidates", 0) || {}
      sources = []

      grounding_chunks = candidate.dig("groundingMetadata", "groundingChunks")
      if grounding_chunks.is_a?(Array)
        grounding_chunks.each do |chunk|
          next unless chunk.is_a?(Hash)
          web = chunk["web"].is_a?(Hash) ? chunk["web"] : {}
          url = web["uri"].to_s.presence || web["url"].to_s.presence
          title = web["title"].to_s.presence || "参考情報"
          next if url.blank?

          sources << { title: title, url: url }
        end
      end

      citations = candidate.dig("citationMetadata", "citations")
      if citations.is_a?(Array)
        citations.each do |citation|
          next unless citation.is_a?(Hash)
          url = citation["uri"].to_s.presence || citation["url"].to_s.presence
          title = citation["title"].to_s.presence || "参考情報"
          next if url.blank?

          sources << { title: title, url: url }
        end
      end

      sources.uniq { |s| s[:url] }.first(3)
    rescue => e
      Rails.logger.warn("[Gemini::Client] parse_sources_error #{e.class}: #{e.message}")
      []
    end

    def post_json(uri, req_body)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = @timeout_sec
      http.read_timeout = @timeout_sec

      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request["x-goog-api-key"] = @api_key
      request.body = JSON.dump(req_body)

      response = http.request(request)
      [ response.code.to_i, response.body.to_s ]
    end
  end
end
