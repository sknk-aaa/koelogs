# voice-app (Koelogs)

ボイストレーニングの記録・分析 Web アプリです。  
日々の練習ログ、録音測定、AIおすすめ生成、コミュニティ集合知を統合して「次の一手」を提案します。

## 主な機能

- 練習ログ（`/log`, `/log/new`）
  - 1日1ログ（練習時間・メニュー・自由記述）
  - 月次振り返り（`monthly_logs`）
  - 月ログに「先月との比較（コーチ診断）」導線を配置
  - 無料: プレミアム誘導モーダル / 有料: 比較診断モーダルを表示
  - 比較モーダルは「成長診断 + 成長実例 + 成長の仕組み（縦フロー）」で表示
- 録音測定（`/training`）
  - 音域 / ロングトーン / 音量安定性 / 音程精度
  - 測定結果は Insights で推移表示
- 分析（`/insights`）
  - 上部帯からCSV出力が可能
  - 期間（最新/30日/90日）と指標フィルタ（すべて/音域/ロングトーン/音量安定性/音程精度）を選択
  - 日次サマリーCSVと測定履歴CSVをダウンロード
- AIおすすめ（`/log`）
  - 週単位（`月曜〜日曜`）で表示・取得
  - 生成は手動ボタン押下時のみ（同日同条件は再生成しない）
  - 参照期間 `14 / 30 / 90` 日を選択して生成
  - 詳細ログは常に直近14日、30/90では月ログ（1か月/3か月）を追加参照
  - テーマ語一致時のみ集合知（コミュニティ投稿）を利用し、非一致時はWebのみで探索
    - 一致語: `音域 / 音程 / 換声点 / 息切れ / 音量 / 力み / 声の抜け / ロングトーン`
  - Web参照は常時ON
  - 集合知集計は `Rails.cache` でキャッシュ（6時間）
  - テーマ入力時は、そのテーマを方針の先頭行に固定（AIが別テーマを再決定しない）
- AI設定（`/settings/ai`）
  - 回答スタイル（カスタム指示 + 選択式: style/tone, 温かみ, 熱量, 絵文字）
  - 改善したい項目（`ai_improvement_tags`）
  - AIが参照する長期プロフィール（声に関して: 強み/課題/成長過程/避けたい練習・注意点）
  - AIおすすめ参照期間（14 / 30 / 90）
- AIおすすめへのフォローアップ会話
  - 今週おすすめに対する質問・調整会話
  - 1スレッド最大20メッセージ、履歴は保持
- AIチャット（`/chat`）
  - 汎用のトレーニング相談チャット
  - 通常会話と「AIおすすめへの質問」スレッドを同一UIで管理
  - 外部知識（Web検索）とKoelogs内データ（ログ/長期プロフィール/おすすめ履歴）を併用
  - チャット由来の保存候補（保存/訂正/スキップ）を表示し、確定時に長期プロフィールへ保存
  - AIおすすめスレッドでは、質問日の切り替わりごとに日付区切り線を表示
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
VITE_GOOGLE_CLIENT_ID=your_google_client_id
FRONTEND_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id

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
  - `POST /api/me/ai_profile/recalculate`
  - `GET /api/me/ai_memory_candidates`
  - `PATCH /api/me/ai_memory_candidates/:id`
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
  - `POST /api/ai_recommendations`（`date`, `range_days`, `today_theme?`）
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
- 保存/取得単位
  - 週キー: `week_start_date`（月曜開始）
  - 同日同条件は `user_id + generated_for_date + range_days` で一意
  - `GET` は指定日の属する週の最新1件を返す
- 根拠の優先順位
  - 1) `ai_custom_instructions`
  - 2) `goal_text`
  - 3) `ai_improvement_tags`
  - 4) 直近ログ + 根拠探索（コミュニティ条件一致時 + Web）
- コミュニティ参照条件（テーマ連動）
  - `today_theme` に次の語が含まれる場合のみコミュニティON
    - `音域 / 音程 / 換声点 / 息切れ / 音量 / 力み / 声の抜け / ロングトーン`
  - 非一致（または未入力）はコミュニティOFF（Webのみ）
- Web/コミュニティ比重判定
  - 判定軸: `目標タグ × 同一メニュー(canonical_key)` 件数
  - `top_menu_count < 5` で Web強度 `high`、それ以外 `light`
- 集合知キャッシュ
  - キー: `collective_effects:v1:window=<days>:min=<count>:tags=<...>`
  - TTL: 6時間
  - 例外時はキャッシュをバイパスして集計（生成継続）
- 録音測定データ参照
  - 改善タグ / 目標 / 自由記述に測定関連の示唆がある場合のみ参照
  - 指標ごとに直近最大10件を集計し、latest / avg_last_5 / delta_vs_prev_5 / count を構築
- 出力
  - プレーンテキスト（Markdown禁止）
  - `1) 今週の方針 / 2) 今の状態 / 3) 今週のおすすめメニュー / 4) 補足`
  - `today_theme` 指定時は「1) 今週の方針」の先頭行にその文を固定
  - `3) 今週のおすすめメニュー` は各項目3行
    - `メニュー名｜時間`
    - `狙い`
    - `根拠: Web / コミュニティ / 両方`（Webソースがある場合はサイト名を併記）

## フォローアップ会話仕様（現行）

- 今週おすすめのみ会話可能
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
  - `users.ai_response_style_prefs`（`style_tone`, `warmth`, `energy`, `emoji`）
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
- チャット由来の保存候補
  - `ai_profile_memory_candidates` に `pending` で保存（期限7日）
  - `/chat` で「保存内容/保存先」を確認し `保存 / 訂正 / スキップ`
  - 2026-03-05時点で新規保存先は `voice` のみ（`profile` は新規受付しない）

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
- メモリ保存候補フロー
  - 候補抽出/分類はAI判定（失敗時は軽量ルールへフォールバック）
  - 「保存」確定時にAI正規化（1文・事実追加禁止）し、失敗時はルール整形へフォールバック
  - 重複チェック（完全一致 + 類似）後に長期プロフィールへ追記

## 無料プラン制限（AIおすすめ質問）

- 無料ユーザーは `source_kind=ai_recommendation` スレッドで
  - **1つの今週おすすめにつき1回**まで質問可能
- プレミアムは回数無制限

## 主要テーブル（抜粋）

- `users`
  - `goal_text`, `ai_custom_instructions`, `ai_improvement_tags`, `ai_response_style_prefs`
- `training_logs`, `training_log_menus`, `training_menus`
- `monthly_logs`
- `measurement_runs`
- `measurement_range_results`
- `measurement_long_tone_results`
- `measurement_volume_stability_results`
- `measurement_pitch_accuracy_results`
- `ai_user_profiles`, `ai_profile_memory_candidates`
- `community_posts`, `community_post_favorites`
- `ai_recommendations`
  - `generated_for_date`, `week_start_date`, `range_days`, `recommendation_text`
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
- 最新実装仕様: `docs/CURRENT_IMPLEMENTATION_SPEC_2026-03-05.md`
- 集合知/AIおすすめ: `docs/COLLECTIVE_INTELLIGENCE_AI_RECOMMENDATIONS.md`
- 測定・月ログ再設計: `docs/MEASUREMENT_MONTHLY_LOG_REDESIGN_SPEC.md`
- パスワード再設定/SMTP: `docs/PASSWORD_RESET_SMTP_IMPLEMENTATION.md`
- エージェント運用: `AGENTS.md`
