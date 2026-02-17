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

    # return String (generated text)
    def generate_text!(user_text:, system_text:, max_output_tokens: 600, temperature: 0.7)
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

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = @timeout_sec
      http.read_timeout = @timeout_sec

      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request["x-goog-api-key"] = @api_key
      request.body = JSON.dump(req_body)

      response = http.request(request)
      status = response.code.to_i
      body = response.body.to_s

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

      text
    rescue JSON::ParserError
      raise Error.new("Gemini API returned non-JSON response", status: status, body: body)
    end
  end
end
