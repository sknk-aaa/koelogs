# frozen_string_literal: true

require "test_helper"
require "ostruct"

module Ai
  class GeneralChatResponderWebSearchTest < ActiveSupport::TestCase
    class FakeClient
      attr_reader :last_web_search
      attr_reader :last_user_text
      attr_reader :call_count
      attr_reader :judge_call_count
      attr_reader :last_judge_user_text

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:, web_search:)
        @judge_call_count = @judge_call_count.to_i + 1
        @last_judge_user_text = user_text
        '{"requires_history":false,"history_window":0,"reason":"direct_answer"}'
      end

      def generate_text_with_usage!(system_text:, user_text:, max_output_tokens:, temperature:, user:, feature:, web_search:)
        @last_web_search = web_search
        @last_user_text = user_text
        @call_count = @call_count.to_i + 1
        {
          text: "参照データ: テスト\nNayの説明です",
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30,
          sources: web_search ? [ { title: "Nay article", url: "https://example.com/nay" } ] : []
        }
      end
    end

    class DictionaryFallbackClient
      attr_reader :call_count
      attr_reader :last_user_text

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:, web_search:)
        '{"requires_history":false,"history_window":0,"reason":"direct_answer"}'
      end

      def generate_text_with_usage!(system_text:, user_text:, max_output_tokens:, temperature:, user:, feature:, web_search:)
        @call_count = @call_count.to_i + 1
        @last_user_text = user_text
        if @call_count == 1
          {
            text: "参照データ: テスト\n曖昧で断定できません。",
            input_tokens: 10,
            output_tokens: 20,
            total_tokens: 30,
            sources: []
          }
        else
          {
            text: "参照データ: 内部辞書\nmum+buzzは内部辞書の定義です。",
            input_tokens: 10,
            output_tokens: 20,
            total_tokens: 30,
            sources: []
          }
        end
      end
    end

    test "passes web_search true for unknown terms and appends references" do
      user = User.create!(email: "general-search@example.com", password: "password123", password_confirmation: "password123")
      thread = OpenStruct.new(title: "テスト会話", project: nil)
      messages = [ OpenStruct.new(role: "user", content: "Nayって何？") ]
      client = FakeClient.new

      text = GeneralChatResponder.new(user: user, thread: thread, messages: messages, client: client).call

      assert_equal 1, client.judge_call_count
      assert_includes client.last_judge_user_text, "Nayって何？"
      assert_equal true, client.last_web_search
      assert_includes client.last_user_text, "最優先質問:"
      assert_includes client.last_user_text, "Nayって何？"
      assert_includes client.last_user_text, "用語/概念の説明を最優先"
      assert_includes text, "参考情報:"
      assert_includes text, "https://example.com/nay"
    end

    test "definition mode keeps prompt focused on latest question" do
      user = User.create!(email: "general-definition@example.com", password: "password123", password_confirmation: "password123")
      thread = OpenStruct.new(title: "裏声最高音をあげる", project: nil)
      messages = [
        OpenStruct.new(role: "assistant", content: "前回はミドルボイスの話でした"),
        OpenStruct.new(role: "user", content: "ブロークンスケールって何ですか？")
      ]
      client = FakeClient.new

      GeneralChatResponder.new(user: user, thread: thread, messages: messages, client: client).call

      assert_equal 1, client.judge_call_count
      assert_includes client.last_user_text, "ブロークンスケールって何ですか？"
      assert(
        client.last_user_text.include?("この質問の説明だけに答える") ||
        client.last_user_text.include?("この質問にのみ答えてください")
      )
    end

    test "falls back to internal term dictionary when web evidence is weak for definition question" do
      user = User.create!(email: "general-dictionary@example.com", password: "password123", password_confirmation: "password123")
      thread = OpenStruct.new(title: "新しい会話", project: nil)
      messages = [ OpenStruct.new(role: "user", content: "リップロールって何ですか？") ]
      client = DictionaryFallbackClient.new

      text = GeneralChatResponder.new(user: user, thread: thread, messages: messages, client: client).call

      assert_equal 2, client.call_count
      assert_includes client.last_user_text, "内部辞書キー: mum_buzz"
      assert_includes text, "mum+buzz"
    end
  end
end
