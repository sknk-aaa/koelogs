# Stripe Go-Live Checklist 2026-03-13

最終更新: 2026-03-13

## 目的

Koelogs をデプロイしたあとに、Stripe の本番決済を安全に有効化するための最小チェックリスト。

## 前提

- Stripe の事業確認と追加情報提出は完了済み
- 現在の課金実装は Stripe Checkout + Billing Portal + Webhook 構成
- テスト環境では `monthly / quarterly` の2プランが動作確認済み

## デプロイ後にやること

### 1. 本番URLを確定する

- 公開URLを確認する
- `/premium` と `/plan` にアクセスできることを確認する

### 2. Stripe本番用のキーと価格IDを用意する

- 本番 `publishable key`
- 本番 `secret key`
- 本番 `price_id`（1か月）
- 本番 `price_id`（3か月）

### 3. 本番環境変数を設定する

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_PREMIUM_MONTHLY`
- `STRIPE_PRICE_PREMIUM_QUARTERLY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_STRIPE_PUBLISHABLE_KEY`

### 4. 本番Webhookを設定する

- Stripe ダッシュボードで本番 endpoint を追加する
- 送信先: `https://<本番URL>/api/billing/webhook`
- `STRIPE_WEBHOOK_SECRET` を本番環境へ設定する

### 5. Billing Portalを本番で確認する

- Stripe ダッシュボードで Billing Portal を有効化する
- 本番環境の `/plan` または `/premium` から `契約を管理` が開けることを確認する

### 6. 本番導線の最終確認

- `/premium` が表示される
- 1か月 / 3か月プランを選べる
- Checkout へ遷移できる
- キャンセル時にアプリへ戻れる
- 成功時にアプリへ戻れる

### 7. 購入反映を確認する

- 購入後に `plan_tier = premium` へ反映される
- `/plan` と `/profile` に現在のプランが表示される
- Webhook が正常に受信される

### 8. 解約導線を確認する

- Billing Portal から解約できる
- アプリ側で `解約予定` 表示になる
- `利用終了予定日` が表示される

## リリース前に見る項目

- 料金表示が本番価格と一致しているか
- 問い合わせ先が公開ページにあるか
- 解約方針が公開ページにあるか
- テスト用キー / テスト用 `price_id` が本番に残っていないか

## 本番切替時の注意

- テスト用 Stripe キーを本番環境に混ぜない
- テスト用 `price_id` を本番環境に混ぜない
- Webhook の送信先URLが本番URLになっていることを確認する

## 完了条件

- 本番 Checkout が開始できる
- 購入後に Premium が反映される
- Billing Portal から契約管理ができる
- 解約後に `解約予定` 表示になる
