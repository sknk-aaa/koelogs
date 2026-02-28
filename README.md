# voice-app (Koelogs)

ボイストレーニングの記録・分析 Web アプリです。  
日々の練習ログ、録音測定、AIおすすめ生成、コミュニティ集合知を統合して「次の一手」を提案します。

## 主な機能

- 練習ログ（`/log`, `/log/new`）
  - 1日1ログ（練習時間・メニュー・自由記述）
  - 月次振り返り（`monthly_logs`）
- 録音測定（`/training`）
  - 音域 / ロングトーン / 音量安定性 / 音程精度
  - 測定結果は Insights で推移表示
- AIおすすめ（`/log`）
  - 参照期間 `14 / 30 / 90` 日を選択して生成
  - 詳細ログは常に直近14日、30/90では月ログ（1か月/3か月）を追加参照
  - 集合知（コミュニティ投稿）は補助根拠として利用
  - 集合知集計は `Rails.cache` でキャッシュ（6時間）
- AI設定（`/settings/ai`）
  - 回答スタイル指示（`ai_custom_instructions`）
  - 改善したい項目（`ai_improvement_tags`）
  - AIが参照する長期プロフィール（自動要約 + ユーザー編集オーバーライド）
- AIおすすめへのフォローアップ会話
  - 当日おすすめに対する質問・調整会話
  - 1スレッド最大20メッセージ、履歴は保持
- AIチャット（`/chat`）
  - 汎用のトレーニング相談チャット
  - 通常会話と「AIおすすめへの質問」スレッドを同一UIで管理
  - 外部知識（Web検索）とKoelogs内データ（ログ/長期プロフィール/おすすめ履歴）を併用
- コミュニティ（`/community`）
  - 投稿 / お気に入り / ランキング / 公開プロフィール

## 技術スタック

- Backend: Ruby on Rails 8.1 (API mode)
- DB: PostgreSQL
- Frontend: React 19 + TypeScript (strict) + Vite
- Auth: Cookie Session
- LLM: Gemini 2.5 Flash

## ルーティング（現行）

- コア導線
  - `/` → `/log` にリダイレクト
  - `/log`
  - `/log/new`（認証必須）
  - `/training`
  - `/insights`
- 分析
  - `/insights/time`
  - `/insights/menus`
  - `/insights/notes`
- 設定 / プロフィール
  - `/settings`（認証必須）
  - `/settings/ai`（認証必須）
  - `/profile`（認証必須）
  - `/mypage`（認証必須）
  - `/chat`（認証必須）
- コミュニティ
  - `/community`
  - `/community/rankings`
  - `/community/profile/:userId`
- ヘルプ
  - `/help/guide`
  - `/help/about`
  - `/help/contact`
- 認証前ページ
  - `/login`
  - `/signup`

## セットアップ

前提:
- Ruby 3.4+
- Node.js 20+
- PostgreSQL

### 1) 依存関係

```bash
bundle install
npm --prefix frontend install
```

### 2) 環境変数（`.env`）

```env
GEMINI_API_KEY=your_gemini_api_key
VITE_API_BASE_URL=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:5173

MAIL_FROM=no-reply@example.com
MAILER_HOST=localhost
MAILER_PORT=3000
SMTP_ADDRESS=
SMTP_PORT=587
SMTP_DOMAIN=localhost
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
CONTACT_MAIL_TO=support@example.com
```

### 3) DB 準備

```bash
bin/rails db:create
bin/rails db:migrate
```

### 4) 起動

```bash
bin/rails server
npm --prefix frontend run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## API 概要（`/api`）

- 認証/ユーザー
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `POST /api/auth/password_reset_requests`
  - `POST /api/auth/password_resets`
  - `GET /api/me`
  - `PATCH /api/me`
- ログ/メニュー
  - `GET /api/training_logs`
  - `POST /api/training_logs`
  - `GET /api/monthly_logs`
  - `POST /api/monthly_logs`
  - `GET/POST/PATCH /api/training_menus`
- 測定/分析
  - `GET /api/measurements`
  - `GET /api/measurements/latest`
  - `POST /api/measurements`
  - `PATCH /api/measurements/:id`
  - `GET /api/insights`
- AIおすすめ
  - `GET /api/ai_recommendations?date=YYYY-MM-DD&range_days=14|30|90`
  - `POST /api/ai_recommendations`（`date`, `range_days`）
  - `GET /api/ai_recommendations/:id/thread`
  - `POST /api/ai_recommendations/:id/thread/messages`
- AIチャット
  - `GET /api/ai_chat/projects`
  - `POST /api/ai_chat/projects`
  - `PATCH /api/ai_chat/projects/:id`
  - `DELETE /api/ai_chat/projects/:id`
  - `GET /api/ai_chat/threads`
  - `POST /api/ai_chat/threads`
  - `GET /api/ai_chat/threads/:id`
  - `PATCH /api/ai_chat/threads/:id`
  - `DELETE /api/ai_chat/threads/:id`
  - `POST /api/ai_chat/threads/:id/messages`
- コミュニティ
  - `GET /api/community/posts`
  - `POST /api/community/posts`
  - `PATCH /api/community/posts/:id`
  - `DELETE /api/community/posts/:id`
  - `GET /api/community/favorites`
  - `POST /api/community/posts/:id/favorite`
  - `DELETE /api/community/posts/:id/favorite`
  - `GET /api/community/rankings`
  - `GET /api/community/profiles/:id`
- その他
  - `GET /api/scale_tracks`
  - `POST /api/help/contact`

## AIおすすめ仕様（現行）

- 参照期間
  - `range_days=14`: 日次ログ14日（詳細）
  - `range_days=30`: 日次ログ14日 + 月ログ1か月（傾向）
  - `range_days=90`: 日次ログ14日 + 月ログ3か月（傾向）
- 同日生成の保存単位
  - `user_id + generated_for_date + range_days` で一意
- 根拠の優先順位
  - 1) `ai_custom_instructions`
  - 2) `goal_text`
  - 3) `ai_improvement_tags`
  - 4) 直近ログ + 集合知
- 集合知キャッシュ
  - キー: `collective_effects:v1:window=<days>:min=<count>`
  - TTL: 6時間
  - 例外時はキャッシュをバイパスして集計（生成継続）
- 録音測定データ参照
  - 改善タグ / 目標 / 自由記述に測定関連の示唆がある場合のみ参照
  - 指標ごとに直近最大10件を集計し、latest / avg_last_5 / delta_vs_prev_5 / count を構築
- 出力
  - プレーンテキスト（Markdown禁止）
  - `1) 今日の方針 / 2) 今の状態 / 3) おすすめメニュー / 4) 補足`

## フォローアップ会話仕様（現行）

- 当日おすすめのみ会話可能
- 1スレッド最大20メッセージ
- 会話コンテキストは直近6往復（12メッセージ）を投入
- 保持データ
  - 生成時コンテキスト（`ai_recommendations.generation_context`）
  - 元おすすめ本文
  - 会話ログ（`ai_recommendation_messages`）
  - モデル/プロンプトバージョン
- 安全ガード
  - 医療断定禁止
  - 不適切要求はテンプレ拒否
  - 大幅な方針変更要求は再生成案内

## AI設定（長期プロフィール）仕様（現行）

- 保存対象
  - `users.ai_custom_instructions`（回答スタイル要求）
  - `users.ai_improvement_tags`
  - `ai_user_profiles`（長期プロフィール）
- 長期プロフィール構造
  - `auto_profile`（AI自動要約）
  - `user_overrides`（ユーザー編集値）
  - `source_window_days=90`
  - `source_fingerprint` / `source_meta`（再計算差分判定）
- 更新
  - `AiUserProfileRefreshJob`（変更時）
  - `AiUserProfilesDailyRefreshJob`（日次更新）
- AI投入
  - `Ai::UserLongTermProfileManager.profile_text_for_prompt` を通して
    AIおすすめ・AIチャットへ投入

## AIチャット仕様（現行）

- 対象
  - `/chat` の汎用会話（`Ai::GeneralChatResponder`）
  - おすすめ追質問チャット（`Ai::RecommendationFollowupResponder`）
- データ優先順位
  - 1) 最新ユーザー質問
  - 2) Koelogs内データ（長期プロフィール/ログ/おすすめ履歴）
  - 3) 外部知識（Web検索、必要時のみ）
- 外部知識併用
  - `Ai::WebSearchDecision` で検索発火判定
  - `Gemini::Client` の `web_search` 有効時に参照URLを抽出
  - 取得できた場合は回答末尾に `参考情報:` を追記

## 主要テーブル（抜粋）

- `users`
  - `goal_text`, `ai_custom_instructions`, `ai_improvement_tags`
- `training_logs`, `training_log_menus`, `training_menus`
- `monthly_logs`
- `measurement_runs`
- `measurement_range_results`
- `measurement_long_tone_results`
- `measurement_volume_stability_results`
- `measurement_pitch_accuracy_results`
- `community_posts`, `community_post_favorites`
- `ai_recommendations`
  - `generated_for_date`, `range_days`, `recommendation_text`
  - `collective_summary`, `generation_context`
  - `generator_model_name`, `generator_prompt_version`
- `ai_recommendation_threads`, `ai_recommendation_messages`
- `ai_contribution_events`
- `xp_events`, `user_badges`

## 開発コマンド

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

## ドキュメント

- AI全体まとめ: `docs/AI_SYSTEM_OVERVIEW_2026-03-01.md`
- 最新実装仕様: `docs/CURRENT_IMPLEMENTATION_SPEC_2026-02-28.md`
- 集合知/AIおすすめ: `docs/COLLECTIVE_INTELLIGENCE_AI_RECOMMENDATIONS.md`
- 測定・月ログ再設計: `docs/MEASUREMENT_MONTHLY_LOG_REDESIGN_SPEC.md`
- パスワード再設定/SMTP: `docs/PASSWORD_RESET_SMTP_IMPLEMENTATION.md`
- エージェント運用: `AGENTS.md`
