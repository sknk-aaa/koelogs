# Security Notes

最終更新: 2026-03-15

## 目的

Koelogs のセキュリティ対応を、ポートフォリオとして説明できる形で整理する。

このドキュメントでは次の4点を説明する。

- どう監査したか
- どんな脆弱性候補を洗い出したか
- どこまで安全に改善したか
- 今後どこを強化するか

このドキュメントでは、セキュリティ対策を次の2段階に分けて整理する。

- 既存設計として最初から入っていた対策
- 今回追加した改善

MVP で先に主要機能を作り、その後に防御層を積み増した流れを説明するためである。

## 既存設計として最初から入っていた対策

### 1. Rails 標準を活かした認証の土台

認証は Cookie Session ベースだが、最低限の安全策は最初から入っていた。

- `has_secure_password` による password digest 管理
- session cookie に `same_site: :lax`
- production のみ `secure: true`
- production で `force_ssl = true`
- `assume_ssl = true`

### 2. 認証まわりのガード

ユーザー認証には、次のようなガードが既存実装として入っていた。

- メールアドレス確認完了前は通常ログイン不可
- パスワードリセット / メール確認トークンは digest 保存
- トークンに TTL を設定
- ログイン失敗回数のカウント
- 一定回数失敗で一時ロック
- Google ログイン時は verified email を要求

### 3. 入力制御とモデルバリデーション

公開入力面やユーザー設定には、長さ・形式・許可値の制御があらかじめ入っていた。

- `User`
  - email 形式 / uniqueness
  - display_name / goal_text / ai_custom_instructions の長さ制限
  - avatar / plan / billing_cycle の許可値制限
- `CommunityPost`
  - effect_level 範囲
  - improvement_tags 許可値
  - comment 最大 240 文字
  - training_menu は本人所有のものだけ許可
- `CommunityTopic`
  - title / body の最大長
  - category 許可値
- `CommunityTopicComment`
  - body 最大長
  - reply 深さ制限
  - 親コメントは同一 topic のみ

### 4. API と公開面の基本的な境界管理

- RequireAuth なページと公開ページを routing で分離
- controller では `current_user` スコープで本人データを取得
- CORS は localhost 開発オリジンに限定
- password reset / email verification request は過度なアカウント列挙を避ける応答にしていた

つまり、最初から「完全に無防備」だったわけではなく、Rails 標準とモデル制約を中心に基本防御は入っていた。

## 監査方法

今回の監査は「自動診断 + 実装レビュー」の2段構成で行った。

### 1. 自動診断

- `bundle exec brakeman -q -n`
- `npm audit --omit=dev`

結果:

- Brakeman: 警告 0 件
- npm audit: 脆弱性 0 件

### 2. 実装レビュー

重点的に確認した対象:

- Cookie Session 認証
- 課金 API
- 認証 API
- 公開コミュニティ API
- メール送信系 API
- production 設定

## 監査で見つけた主要論点

### 1. Cookie Session 認証と CSRF の整理不足

Rails API + Cookie Session 構成だが、明示的な CSRF 保護の実装はまだ入っていない。

現状:

- `ActionController::Cookies` を利用
- session は `same_site: :lax`
- ただし `protect_from_forgery` ベースの設計は未導入

評価:

- 直ちに危険というより「整理不足」
- 重要だが、導入時に既存フロントとの整合調整が必要

### 2. メール送信・問い合わせ系の濫用耐性が弱かった

次の API は abuse されやすい。

- `signup`
- `password_reset_request`
- `email_verification_request`
- `help/contact`

監査時点では IP / user 単位の明示的なレート制限がなかった。

### 3. 公開投稿系の連投耐性が弱かった

コミュニティ投稿・トピック・コメントは validation はあったが、短時間連投への抑止が不足していた。

### 4. 本番ヘッダ hardening が不足していた

`force_ssl` は入っていたが、次のような基本ヘッダが明示されていなかった。

- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`

また、`config.hosts` も未設定だった。

## 今回追加した改善

既存挙動を壊しにくい範囲に絞って、安全側の改善を行った。

### 1. レート制限の導入

共通の軽量レート制限基盤を追加した。

- `app/services/security/rate_limiter.rb`
- `app/controllers/concerns/rate_limitable.rb`

対象 endpoint:

- `signup`
- `password_reset_request`
- `email_verification_request`
- `help/contact`
- `community post create`
- `community topic create`
- `community comment create`

狙い:

- メール送信 abuse の抑止
- bot 的な連投の抑止
- 公開入力面の負荷軽減

### 2. production 用セキュリティヘッダの追加

`config/environments/production.rb` に次を追加した。

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Permitted-Cross-Domain-Policies: none`

加えて、`APP_HOSTS` 環境変数が設定されている場合のみ `config.hosts` を有効化するようにした。

これにより、既存のローカル開発や未設定環境を壊さず、本番だけ防御を強化できる。

## テスト

追加したセキュリティ改善に対して、integration test を追加している。

- `test/integration/api/security_rate_limits_test.rb`

確認内容:

- パスワード再設定メール送信の回数制限
- 問い合わせ送信の回数制限

既存の smoke test も再実行し、課金・認証系を壊していないことを確認した。

## 今後の改善候補

### 1. CSRF 対策の正式導入

今回あえて見送った項目。

理由:

- Cookie Session 構成では重要
- ただし既存フロントとのトークン受け渡し設計が必要
- 影響範囲が広いため、別フェーズで導入するのが安全

### 2. Content Security Policy

Google Identity script や外部連携を整理したうえで、最小権限の CSP を導入したい。

### 3. abuse 監視の運用化

将来的には、レート制限に加えて以下も検討対象。

- 管理者向け通知
- 短時間連投ログ
- BAN / cooldown の仕組み

## ポートフォリオでの説明例

「このプロジェクトは、MVP 段階から Rails 標準の `has_secure_password`、Cookie 設定、SSL 強制、メール確認、ログインロック、モデルバリデーションなどの基本防御は入っていました。そのうえで今回、Brakeman と npm audit に加えて手動監査を行い、abuse 耐性と本番 hardening の不足を確認しました。改善では、signup・問い合わせ・コミュニティ投稿系にレート制限を導入し、production には基本的なセキュリティヘッダと host 制限の土台を追加しました。最初から最低限を守りつつ、後から運用リスクの高い部分を段階的に強化した構成です。」
