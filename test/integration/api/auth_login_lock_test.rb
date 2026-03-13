require "test_helper"

class Api::AuthLoginLockTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      email: "lock-test@example.com",
      password: "password123",
      password_confirmation: "password123",
      email_verified_at: Time.current
    )
  end

  test "locks login after five failed attempts" do
    5.times do |index|
      post "/api/auth/login", params: { email: @user.email, password: "wrong-password" }

      assert_response :unauthorized
      expected_message =
        if index == 4
          "ログイン失敗が続いたため、60分間ログインを制限しました。しばらく待ってから再度お試しください。"
        else
          "invalid email or password"
        end
      assert_equal expected_message, response.parsed_body["error"]
    end

    @user.reload
    assert_equal 5, @user.failed_login_attempts
    assert_not_nil @user.login_locked_until
    assert @user.login_locked_until > Time.current
  end

  test "rejects valid password while login is locked" do
    @user.update!(failed_login_attempts: 5, login_locked_until: 30.minutes.from_now)

    post "/api/auth/login", params: { email: @user.email, password: "password123" }

    assert_response :too_many_requests
    assert_equal "ログイン失敗が続いています。60分後に再度お試しください。", response.parsed_body["error"]
  end

  test "successful login clears failed attempts and lock" do
    @user.update!(failed_login_attempts: 3, login_locked_until: nil)

    post "/api/auth/login", params: { email: @user.email, password: "password123" }

    assert_response :ok
    @user.reload
    assert_equal 0, @user.failed_login_attempts
    assert_nil @user.login_locked_until
  end

  test "expired lock allows login again" do
    @user.update!(failed_login_attempts: 5, login_locked_until: 1.minute.ago)

    post "/api/auth/login", params: { email: @user.email, password: "password123" }

    assert_response :ok
    @user.reload
    assert_equal 0, @user.failed_login_attempts
    assert_nil @user.login_locked_until
  end
end
