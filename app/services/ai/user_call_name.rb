# frozen_string_literal: true

module Ai
  module UserCallName
    HONORIFICS = %w[さん 様 さま 先生 ちゃん くん].freeze
    MAX_CALL_NAME_LEN = 36

    module_function

    def resolve(user)
      name = user&.display_name.to_s.strip
      return "あなた" if name.blank?

      return name.slice(0, MAX_CALL_NAME_LEN) if honorific_attached?(name)

      "#{name}さん".slice(0, MAX_CALL_NAME_LEN)
    end

    def honorific_attached?(name)
      HONORIFICS.any? { |suffix| name.end_with?(suffix) }
    end
  end
end
