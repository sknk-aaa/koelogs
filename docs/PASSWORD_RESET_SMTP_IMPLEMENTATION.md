# パスワード再設定 + SMTP設定まとめ（2026-02）

## 目的
- ログイン画面から「パスワードを忘れた？」を実行できるようにする
- メール経由で本人確認し、安全にパスワード再設定を完了させる
- Gmail / SendGrid のどちらでも、環境変数だけで送信設定を切り替えられるようにする

## 採用した技術
- Backend: Ruby on Rails（ActionMailer / has_secure_password）
- Frontend: React + TypeScript（`/login` 内でUI切替）
- DB: PostgreSQL（再設定トークンの digest と発行時刻を保存）
- SMTP: Gmail または SendGrid（`ActionMailer delivery_method=:smtp`）

## 実装方針
1. トークンは平文保存しない
  - メールに載せるのは平文トークン
  - DBには `SHA256 digest` のみ保存
2. 期限付き・ワンタイム運用
  - 有効期限: 30分
  - 再設定成功時に digest / sent_at を即時クリア
3. ユーザー列挙を防ぐ
  - メール送信要求APIは、存在有無に関わらず同一レスポンスを返す
4. ルーティングは既存方針を維持
  - 新規ページは作らず、`/login` で画面を切り替え

## 追加したAPI

### `POST /api/auth/password_reset_requests`
- 入力: `email`
- 役割: ユーザーが存在すれば再設定メールを送信
- 返却: 常に `ok: true`（存在有無を隠す）

### `POST /api/auth/password_resets`
- 入力: `token`, `password`, `password_confirmation`
- 役割: トークン検証後にパスワード更新
- 成功時: トークン情報を無効化して保存

### `POST /api/help/contact`
- 入力: `category`, `email`, `subject`, `message`
- 役割: お問い合わせフォーム送信時に運営宛メールを送信
- 返却: 成功時 `ok: true`、バリデーション失敗時は `422`

## 主要な実装ファイル
- ルート: `config/routes.rb`
- 認証API: `app/controllers/api/auth_controller.rb`
- トークン処理: `app/models/user.rb`
- メーラー: `app/mailers/password_reset_mailer.rb`
- メール本文: `app/views/password_reset_mailer/reset_email.text.erb`
- お問い合わせメーラー: `app/mailers/contact_mailer.rb`
- お問い合わせ本文: `app/views/contact_mailer/inquiry_email.text.erb`
- フロントAPI: `frontend/src/api/auth.ts`
- ログインUI: `frontend/src/pages/LoginPage.tsx`
- スタイル: `frontend/src/pages/AuthPages.css`

## DB変更
- Migration: `db/migrate/20260220190000_add_password_reset_fields_to_users.rb`
- 追加カラム:
  - `users.password_reset_token_digest:string`
  - `users.password_reset_sent_at:datetime`
- 追加index:
  - `index_users_on_password_reset_token_digest`（unique）

## SMTP設定（実装した設定）

### 開発環境 `config/environments/development.rb`
- `SMTP_ADDRESS` がある場合:
  - `delivery_method = :smtp`
  - `smtp_settings` を環境変数から構築
- `SMTP_ADDRESS` がない場合:
  - `delivery_method = :test`（誤送信防止）

### 本番環境 `config/environments/production.rb`
- `delivery_method = :smtp` を固定
- 下記を必須ENVとして `fetch` で読込:
  - `SMTP_ADDRESS`
  - `SMTP_USERNAME`
  - `SMTP_PASSWORD`
- 送信元は `MAIL_FROM` を使用（`app/mailers/application_mailer.rb`）

## 使用する環境変数
- 共通:
  - `MAIL_FROM`
  - `MAILER_HOST`
  - `MAILER_PORT`（必要時）
  - `FRONTEND_ORIGIN`（再設定リンク生成先）
- SMTP:
  - `SMTP_ADDRESS`
  - `SMTP_PORT`
  - `SMTP_DOMAIN`
  - `SMTP_USERNAME`
  - `SMTP_PASSWORD`
  - `SMTP_AUTHENTICATION`
  - `SMTP_ENABLE_STARTTLS_AUTO`
  - `SMTP_OPEN_TIMEOUT`
  - `SMTP_READ_TIMEOUT`
  - `CONTACT_MAIL_TO`（任意。未設定時は `MAIL_FROM` 宛に送信）

## Gmail利用時の設定要点
- Googleアカウントで2段階認証を有効化
- 「アプリパスワード」を発行し、`SMTP_PASSWORD` に設定
- 通常のログインパスワードは使わない
- `MAIL_FROM` と `SMTP_USERNAME` は同じ Gmail に揃える

## SendGrid利用時の設定要点
- `SMTP_ADDRESS=smtp.sendgrid.net`
- `SMTP_USERNAME=apikey`
- `SMTP_PASSWORD=<SendGrid API Key>`
- `MAIL_FROM` は SendGrid 側で検証済み送信元アドレスを使う

## 動作確認手順
1. `.env` にSMTP値を設定
2. Rails再起動
3. ログイン画面で「パスワードを忘れた？」からメール送信
4. メール内URLを開き、新パスワードを設定
5. 新パスワードでログインできることを確認

手動メール送信テスト:
```bash
bin/rails runner 'PasswordResetMailer.with(user: User.first, token: "test-token").reset_email.deliver_now'
```

## ポートフォリオで説明できるポイント
- メールリンク式の再設定で、パスワード忘れUXを改善
- トークン平文をDB保存しない実装で漏洩耐性を確保
- ユーザー列挙を避けるレスポンス設計
- 開発/本番でSMTP設定を分離し、運用事故を減らす構成
