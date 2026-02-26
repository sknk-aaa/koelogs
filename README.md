# voice-app

ボイストレーニングの記録・分析Webアプリです。  
日々の練習ログ管理、分析可視化、AIおすすめ、AI録音分析、コミュニティ投稿/ランキングを提供します。

## 主な機能

- 練習ログ
  - 日付単位の記録（`/log`, `/log/new`）
  - 練習時間、メニュー、メモ、最高音（地声/裏声）
- トレーニング再生
  - スケール/音域タイプ（low/mid/high）選択と音源再生（`/training`）
  - テンポ選択UIは廃止（音源側で固定テンポ）
  - 対応スケール: `5tone` / `Descending5tone` / `triad` / `octave` / `Risingoctave`
  - 音源命名規則: `public/scales/{scale}-{range}.mp3`
- 録音測定（`/training`）
  - 音域 / ロングトーン / 音量安定性 / 音程精度 を測定
  - 音程精度はスケール（low/mid/high）選択後、録音開始と同時に固定ガイド音源を再生
  - 参照バー（ターゲット音程）と自分のピッチ線を同時表示し、追従精度を確認
- 分析
  - 練習時間推移
  - メニュー別分析
  - 最高音推移（`/insights*`）
- AIおすすめ
  - 直近ログをもとに当日の練習方針を生成
- AI録音分析
  - 分析メニュー作成（比較条件/詳細設定）
  - 判定項目選択
  - 分析履歴管理（`/analysis/history`）
  - 録音保存ON時は履歴で再生可能
- コミュニティ
  - 投稿一覧/お気に入り切替（`/community`）
  - 構造化投稿（メニュー/効果タグ/実感度/任意コメント）
  - 投稿お気に入り
  - 公開プロフィール（`/community/profile/:userId`）
  - ランキング（`/community/rankings`）
- プロフィール
  - 表示名・公開設定更新
  - ランキング参加設定
  - アイコン自由設定（プリセット + カスタム画像）
  - パスワード再設定（現在パスワード照合あり）
- マイページ
  - バッジ / 進捗 / ミッションの確認
  - ミッションは「デイリー（常時表示）」+「もっと見る（初心者）」構成
  - 継続ミッション（バッジ）はミッション折りたたみと独立して常時表示
  - バッジ獲得時は専用ポップアップ表示（ミッション達成とは独立）
- ヘルプ / お問い合わせ
  - 使い方ガイド（`/help/guide`）
  - アプリ説明（`/help/about`）
  - お問い合わせフォーム（`/help/contact`）

## 技術スタック

- Backend: Ruby on Rails 8 (API) / PostgreSQL
- Frontend: React + TypeScript + Vite + React Router
- AI: Gemini 2.5 Flash API

## ルーティング（要点）

- コア固定導線:
  - `/`（`/log` にリダイレクト）
  - `/log`
  - `/log/new`
  - `/training`
  - `/insights`
- 主要追加導線:
  - `/community`
  - `/community/rankings`
  - `/community/profile/:userId`
  - `/mypage`
- レイアウト外（公開）:
  - `/login`
  - `/signup`
- レイアウト内（公開）:
  - `/log`
  - `/training`
  - `/insights`, `/insights/time`, `/insights/menus`, `/insights/notes`
  - `/community`, `/community/rankings`, `/community/profile/:userId`
  - `/help/guide`, `/help/about`, `/help/contact`
- レイアウト内（ログイン必須）:
  - `/log/new`
  - `/analysis/history`
  - `/settings`
  - `/profile`
  - `/mypage`

## セットアップ

前提:
- Ruby 3.4.x
- Node.js 20+
- PostgreSQL

### 1) 依存関係インストール

```bash
bundle install
npm --prefix frontend install
```

### 2) 環境変数

プロジェクトルートの `.env` に最低限以下を設定してください。

```env
GEMINI_API_KEY=your_gemini_api_key
VITE_API_BASE_URL=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:5173

# Mail (common)
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

任意:

```env
VITE_RAILS_ORIGIN=http://localhost:3000
```

### 2.1) SMTP設定（Gmail / SendGrid）

パスワード再設定メールは `ActionMailer + SMTP` で送信します。

- Gmail（2段階認証 + アプリパスワード）

```env
MAIL_FROM=your_gmail_address@gmail.com
MAILER_HOST=localhost
MAILER_PORT=3000
SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_DOMAIN=gmail.com
SMTP_USERNAME=your_gmail_address@gmail.com
SMTP_PASSWORD=your_16char_app_password
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
```

- SendGrid（推奨）

```env
MAIL_FROM=verified_sender@yourdomain.com
MAILER_HOST=your-api-domain.com
SMTP_ADDRESS=smtp.sendgrid.net
SMTP_PORT=587
SMTP_DOMAIN=your-api-domain.com
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxx
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
```

動作確認（開発環境）:

```bash
bin/rails runner 'PasswordResetMailer.with(user: User.first, token: "test-token").reset_email.deliver_now'
```

### 3) DB準備

```bash
bin/rails db:create
bin/rails db:migrate
```

### 4) 起動

Backend (Rails):

```bash
bin/rails server
```

Frontend (Vite):

```bash
npm --prefix frontend run dev
```

アクセス:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## API概要

`/api` 配下の主なエンドポイント:

- 認証
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `POST /api/auth/password_reset_requests`
  - `POST /api/auth/password_resets`
  - `GET /api/me`
  - `PATCH /api/me`
    - 公開設定/ランキング参加/アイコン更新
    - パスワード再設定（`current_password`, `password`, `password_confirmation`）
- ログ
  - `GET /api/training_logs`
  - `POST /api/training_logs`
  - `GET /api/monthly_logs`
  - `POST /api/monthly_logs`
- メニュー
  - `GET/POST/PATCH /api/training_menus`
  - `GET /api/analysis_menus`（固定プリセットのみ）
- AI録音分析セッション
  - `GET/POST/DELETE /api/analysis_sessions`
  - `POST /api/analysis_sessions/:id/upload_audio`
- コミュニティ
  - `GET /api/community/posts`
  - `POST /api/community/posts`
  - `GET /api/community/favorites`
  - `POST /api/community/posts/:id/favorite`
  - `DELETE /api/community/posts/:id/favorite`
  - `GET /api/community/rankings`
  - `GET /api/community/profiles/:id`
- その他
  - `GET /api/scale_tracks`
  - `GET /api/insights`
  - `GET/POST /api/ai_recommendations`
  - `POST /api/help/contact`

## DB設計（現行）

`db/schema.rb`（version: `2026_02_21_122000`）時点のテーブル一覧です。

### users
- 用途: ユーザー情報/認証/公開設定
- 主なカラム:
  - `email`（unique, not null）
  - `password_digest`（not null）
  - `display_name`
  - `goal_text`（max 50）
  - `avatar_icon`（not null, default: `note_blue`）
  - `avatar_image_url`（nullable）
  - `public_profile_enabled`（default false）
  - `public_goal_enabled`（default false）
  - `ranking_participation_enabled`（default false）

### training_logs
- 用途: 1日1件の練習ログ
- 主なカラム:
  - `user_id`, `practiced_on`
  - `duration_min`, `notes`
- 制約:
  - `index_training_logs_on_user_id_and_practiced_on`（unique）

### training_log_menus
- 用途: 日次ログと練習メニューの中間
- 主なカラム:
  - `user_id`, `training_log_id`, `training_menu_id`
- 制約:
  - `idx_training_log_menus_unique`（`training_log_id, training_menu_id` unique）

### training_log_feedbacks
- 用途: 日次ログの効果メモ
- 主なカラム:
  - `user_id`, `training_log_id`
  - `menu_effects`（jsonb）
  - `effective_menu_ids`（jsonb）
  - `improvement_tags`（jsonb）
- 制約:
  - `training_log_id` unique（1ログ1件）

### monthly_logs
- 用途: 月次振り返り
- 主なカラム:
  - `user_id`, `month_start`
  - `notes`
- 制約:
  - `index_monthly_logs_on_user_id_and_month_start`（unique）

### training_menus
- 用途: ユーザー定義の練習メニュー
- 主なカラム:
  - `user_id`, `name`, `color`, `archived`
  - `focus_points`
  - `canonical_*` 一式（正規化情報）
- 制約:
  - `index_training_menus_on_user_id_and_name`（unique）

### menu_aliases
- 用途: メニュー表記ゆれ辞書
- 主なカラム:
  - `normalized_name`（unique）
  - `canonical_key`, `confidence`, `source`
  - `first_seen_at`, `last_seen_at`

### analysis_menus
- 用途: AI録音分析用メニュー
- 主なカラム:
  - `user_id`, `name`, `system_key`, `focus_points`
  - `compare_mode`, `compare_by_scale`, `fixed_scale_type`
  - `compare_by_tempo`, `fixed_tempo`
  - `selected_metrics`（jsonb）
  - `archived`
- 制約:
  - `index_analysis_menus_on_user_id_and_name`（unique）
  - `index_analysis_menus_on_user_id_and_system_key`（unique）

### analysis_sessions
- 用途: AI録音分析の実行結果
- 主なカラム:
  - `user_id`, `analysis_menu_id`
  - `duration_sec`, `measurement_kind`, `peak_note`, `lowest_note`
  - `pitch_stability_score`, `voice_consistency_score`, `range_semitones`
  - `recorded_scale_type`, `recorded_tempo`
  - `feedback_text`, `raw_metrics`（jsonb）
  - `audio_path`, `audio_content_type`, `audio_byte_size`

### ai_recommendations
- 用途: AIおすすめ保存
- 主なカラム:
  - `user_id`, `generated_for_date`, `range_days`, `recommendation_text`
- 制約:
  - `index_ai_recommendations_on_user_id_and_generated_for_date`（unique）

### community_posts
- 用途: コミュニティ投稿（集合知入力）
- 主なカラム:
  - `user_id`, `training_menu_id`, `canonical_key`
  - `improvement_tags`（jsonb）
  - `effect_level`（1..5）
  - `comment`, `published`, `practiced_on`

### community_post_favorites
- 用途: コミュニティ投稿のお気に入り
- 主なカラム:
  - `user_id`, `community_post_id`
- 制約:
  - `idx_community_post_favorites_unique`（`user_id, community_post_id` unique）

### ai_contribution_events
- 用途: AIおすすめへの投稿貢献イベント
- 主なカラム:
  - `user_id`, `ai_recommendation_id`
  - `canonical_key`, `improvement_tags`（jsonb）
- 制約:
  - `idx_ai_contrib_unique_user_recommendation`（`user_id, ai_recommendation_id` unique）

### user_badges
- 用途: 獲得バッジ
- 主なカラム:
  - `user_id`, `badge_key`, `unlocked_at`
- 制約:
  - `index_user_badges_on_user_id_and_badge_key`（unique）

### xp_events
- 用途: XP加算履歴
- 主なカラム:
  - `user_id`, `rule_key`, `points`
  - `source_type`, `source_id`
- 制約:
  - `idx_xp_events_unique_source`（`user_id, rule_key, source_type, source_id` unique）

### scale_tracks
- 用途: トレーニング用音源管理
- 主なカラム:
  - `scale_type`, `range_type`, `tempo`, `file_path`
  - `range_type`: `low` / `mid` / `high`
  - `tempo`: DB保持のみ（TrainingPageの選択UIでは未使用）

## AI録音分析メモ

- 判定項目（詳細設定で選択）:
  - ピッチ安定度
  - 音程精度
  - 音量安定
  - 発声時間
  - 最高音
  - 発声の大きさの平均
- デフォルト:
  - ピッチ安定度 / 音程精度 / 音量安定
- 比較条件:
  - スケール / テンポ を任意固定可能
- 録音保存:
  - 「録音も保存する」ON時のみ保存
  - 履歴一覧・履歴詳細で再生可能

## 開発用コマンド

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

## ドキュメント

- UI監査: `docs/UI_AUDIT.md`
- 開発ログ:
  - `docs/DEVLOG_02-17.md`
  - `docs/DEVLOG_02-18.md`
  - `docs/DEVLOG_02-19.md`
- 未ログイン/初ログイン改善: `docs/ONBOARDING_GUEST_FIRST_LOGIN_IMPROVEMENTS.md`
- 週ログ実装: `docs/WEEKLY_LOG_IMPLEMENTATION.md`
- 集合知/AIおすすめ: `docs/COLLECTIVE_INTELLIGENCE_AI_RECOMMENDATIONS.md`
- パスワード再設定/SMTP設定: `docs/PASSWORD_RESET_SMTP_IMPLEMENTATION.md`
- エージェント運用ルール: `AGENTS.md`
