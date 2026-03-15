# Security Review 2026-03-13

最終更新: 2026-03-13

## 目的

Koelogs の最小限の脆弱性診断運用を開始し、実施記録を残す。

## 実施範囲

- 依存関係の脆弱性確認
- Rails アプリケーションの静的診断
- 認証・課金まわりの重点レビュー
- 公開ディレクトリ / 秘密情報露出の確認

## 実施内容

### 1. frontend 依存関係監査

- 実行: `npm audit --omit=dev`
- 結果: `found 0 vulnerabilities`

### 2. Rails 静的診断

- 実行: `bundle exec brakeman -q -n`
- 結果: `Security Warnings: 0`

### 3. 認証まわり確認

- `/api/auth/login` にメールアドレス単位のログイン失敗ロックを追加済み
- 仕様:
  - 5回失敗でロック
  - 60分後に解除
  - 成功時は失敗回数をリセット
- テスト:
  - `bin/rails test test/integration/api/auth_login_lock_test.rb`

### 4. 課金まわり確認

- `/api/billing/checkout`
  - `require_login!` あり
  - `billing_cycle` は `monthly / quarterly` のみ許可
- `/api/billing/checkout/confirm`
  - `session_id` 必須
  - `client_reference_id`, `metadata.user_id`, `stripe_customer_id` で所有者確認あり
- `/api/billing/webhook`
  - `Stripe-Signature` 署名検証あり

### 5. 公開ディレクトリ確認

- `public/`, `frontend/public/` 配下に秘密情報なし
- 確認した秘密情報ファイル:
  - `./.env`
  - `./frontend/.env`
  - `./config/master.key`
- これらは公開ディレクトリ外に配置されている

## 結果

- 本レビュー範囲では重大な脆弱性は未検出
- frontend 依存関係監査: 問題なし
- Rails 静的診断: 問題なし
- 認証: ログイン試行制限を追加
- 課金: 所有者確認と webhook 署名検証を確認

## 今後の定期運用

以下のタイミングで再実施する。

- 毎月1回
- 認証機能を変更したとき
- 課金機能を変更したとき
- 依存関係を大きく更新したとき

再実施時の最小メニュー:

1. `npm audit --omit=dev`
2. `bundle exec brakeman -q -n`
3. 認証・課金まわりのコード確認
4. `public/`, `frontend/public/` に秘密情報がないか確認

## 次回予定

- 次回実施目安: 2026-04-13
