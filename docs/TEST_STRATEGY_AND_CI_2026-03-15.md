# テスト戦略とCI方針（2026-03-15）

最終更新: 2026-03-15

## 目的

Koelogs をポートフォリオとして説明するときに、次の3点を明確に示せる状態を作る。

- テストを書いている
- CI で自動実行している
- どこをどう守る設計かを説明できる

今回の導入方針は、既存挙動を壊さないことを最優先にした「最小構成の実用テスト」である。

このドキュメントでは、品質強化を次の2段階に分けて整理する。

- 既存設計として最初から入っていた品質対策
- 今回追加したテスト / CI 強化

MVP で機能を先に成立させたうえで、高リスク領域から段階的に自動化を広げた、という流れを説明するためである。

## 既存設計として最初から入っていた品質対策

### 1. Backend には Minitest ベースのテスト文化がすでにあった

今回ゼロからテスト文化を作ったわけではなく、Rails 標準の Minitest を使った既存テストがすでに存在していた。

- service test
  - AI recommendation 系
  - billing 系
- integration test
  - 認証
  - `/api/me`
  - 月ログ比較
  - AI recommendation 系

つまり、Backend では「重要機能はテストで守る」という土台がすでにあり、今回はその運用を広げた形である。

### 2. 静的解析と lint の CI は先に入っていた

GitHub Actions には、今回の追加前から次の自動チェックがあった。

- `scan_ruby`
  - Brakeman
- `lint`
  - RuboCop

この段階で、Rails の典型的な脆弱性と Ruby コードスタイルは継続的に検査していた。

### 3. 実装面でも「壊れにくさ」を意識した構成だった

テスト以外にも、もともと次のような設計が入っていた。

- frontend は `pages / features / api / types` で責務分離
- backend は service object を多用し、課金や AI 生成を controller から分離
- 重要 API は integration test を書きやすい粒度で分割

そのため、今回のテスト追加も大きなリファクタなしで差し込めた。

## 方針

このプロジェクトは Rails API + React/Vite の構成で、AI・測定・課金・コミュニティまで責務が広い。
そのため、最初から E2E を大きく入れるのではなく、以下の順で積み上げる。

1. Backend
認証・課金・API シリアライズのように、壊れると影響が大きい領域を Minitest で守る。

2. Frontend
API 通信ユーティリティや localStorage ベースの状態管理など、副作用が明確でテストしやすい箇所から Vitest で守る。

3. CI
毎回の push / pull request で、Lint・静的解析・backend smoke test・frontend test/build を自動実行する。

## 今回追加した品質強化

今回の追加は「既存の土台の上に、抜けていた自動化を足す」ことに絞った。

- frontend に unit test 基盤を追加
- backend の課金代表ケースを追加
- GitHub Actions に backend smoke test / frontend test-build を追加

最初から full E2E へ進まず、既存挙動を壊しにくい範囲で段階導入している。

## 現在のテストレイヤー

### Backend

既存の Rails / Minitest を継続利用する。

- サービステスト
  - AI recommendation 系
  - Billing 系
- Integration test
  - 認証
  - `/api/me`
  - 月ログ比較
  - AI recommendation 系

今回、課金まわりの代表ケースを追加した。

- `test/services/billing/portal_session_creator_test.rb`
  - Stripe customer 欠損時の復元経路を確認
- `test/services/billing/stripe_subscription_refresher_test.rb`
  - `subscription_id` があるとき customer 欠損でも同期できることを確認
- `test/integration/api/billing_portal_test.rb`
  - `POST /api/billing/portal` が URL を返すことを API レベルで確認

### Frontend

今回、新たに Vitest + jsdom を導入した。

対象は「最小変更で価値が高い箇所」に絞っている。

- `frontend/src/api/billing.test.ts`
  - Checkout / Portal / refresh の通信ユーティリティ
  - エラー文言の伝播
  - リクエスト payload の確認
- `frontend/src/features/tutorial/tutorialFlow.test.ts`
  - localStorage 保存/読込
  - 旧 stage 値の互換変換
  - stage change event の通知

## なぜこの戦略にしたか

### 1. 高リスク領域を先に守れる

課金・認証・状態管理は、UI の細かな見た目よりも壊れたときの影響が大きい。
そのため、まずはここを自動テスト化するのが費用対効果が高い。

### 2. 既存構成を大きく崩さない

Backend は既存の Minitest をそのまま使っている。
Frontend も Playwright のような重い E2E から始めず、Vitest の unit test だけを最小導入した。

### 3. ポートフォリオで説明しやすい

「Backend は API / service を Minitest、Frontend は state / API util を Vitest、CI で両方回している」と説明できる。

## CI 構成

GitHub Actions: `.github/workflows/ci.yml`

現在のジョブ:

- `scan_ruby`
  - 既存
  - Brakeman
- `lint`
  - 既存
  - RuboCop
- `backend_test`
  - 今回追加
  - PostgreSQL を立てて backend smoke suite を実行
- `frontend_test`
  - 今回追加
  - `npm ci`
  - `npm run test`
  - `npm run build`

## backend smoke suite にしている理由

現時点では、既存の Rails 全件テストに「今回の変更とは無関係な赤いテスト」が残っている。
主に AI recommendation 系と一部 integration test で、認証前提や validation 前提のズレがある。

そのため CI では、まず次の高優先領域を安定して回す。

- `test/services/billing`
- `test/integration/api/auth_login_lock_test.rb`
- `test/integration/api/me_billing_test.rb`
- `test/integration/api/billing_portal_test.rb`

これは「失敗を隠すため」ではなく、
1. まず CI を緑で回す
2. 高リスク領域から守る
3. その後、既存の赤いテストを順次復旧して対象を広げる
という段階導入のためである。

## ローカル実行コマンド

### Backend smoke test

```bash
bundle exec rails test \
  test/services/billing \
  test/integration/api/auth_login_lock_test.rb \
  test/integration/api/me_billing_test.rb \
  test/integration/api/billing_portal_test.rb
```

### Frontend test

```bash
cd frontend
npm run test
```

### Frontend build

```bash
cd frontend
npm run build
```

## 今後の拡張方針

次の順で広げるのが自然。

1. AI recommendation 系の既存 failing test を整理して full backend suite を CI に乗せる
2. Frontend の UI コンポーネントテストを追加する
3. 課金導線やログ導線の E2E を Playwright で追加する

## ポートフォリオでの説明例

「このプロジェクトは、MVP 段階から Rails の Minitest と GitHub Actions の Brakeman / RuboCop が入っていて、最低限の品質土台はありました。そのうえで今回、Frontend に Vitest を導入し、Backend には課金 API の代表ケースを追加し、CI には backend smoke test と frontend test-build を足しました。最初から全部を網羅するのではなく、高リスク領域から段階的に自動化を広げる実務寄りの進め方を取っています。」
