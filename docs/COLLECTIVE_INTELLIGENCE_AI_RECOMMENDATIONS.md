# 集合知をAIおすすめ生成に利用する設計・実装まとめ（2026-02 更新）

> 最終更新: 2026-02-28（集合知キャッシュ / 参照期間14-30-90 / 測定根拠連携 / フォローアップ会話 / 長期プロフィール設定 / AIチャット外部知識連携）

## 目的
- 個人ログだけでは不足する知見を、コミュニティ投稿から補完してAIおすすめ品質を上げる
- 「どの根拠で提案したか」をユーザーに説明できる状態を維持する
- 投稿者の貢献を可視化し、継続投稿の動機を作る

## 現在の全体方針
1. **集合知入力はコミュニティ投稿に一本化（段階移行）**
  - 旧: `training_log_feedbacks.menu_effects`
  - 新: `community_posts`
2. **推薦の主根拠は個人ログ、集合知は補助根拠**
3. **集合知は閾値で信頼性担保**
  - 直近90日
  - `min_count = 3`
  - `unknown|*` は除外
4. **目標タグ一致を優先**
  - `goal_text` から改善タグ推定
  - 一致する集合知を優先利用
5. **説明文はコミュニティ由来が分かる文面に統一**
  - 旧ラベルの `出典: 全体傾向` は使用しない方針

## 最新差分（2026-02-27反映）
- AIおすすめプロンプト（`Ai::RecommendationGenerator`）
  - 集合知根拠文は `3)おすすめメニュー` の末尾に1回だけ記述（各メニューへ同文を繰り返さない）
  - `2) 足りていない点` は廃止し、`2) 今の状態` に統一
    - `不足/足りない` の表現を避け、観測事実 + 次の一手で記述
    - 次の一手は1文に圧縮
  - `3) おすすめメニュー` は各項目2行固定
    - 1行目: `メニュー名｜時間`
    - 2行目: `狙い（1文）`
- 集合知入力の要約量を削減（プロンプト投入量を最適化）
  - rows: 最大3
  - top_menus: 最大2
  - top_scales: 最大2
  - detail_samples: 最大1
- コミュニティ投稿の利用項目
  - `menu_name(canonical_key)`, `improvement_tags`, `used_scale_type`, `used_scale_other_text`, `comment`
  - `effect_level` はDB保持されるが、現行投稿UIでは未入力
- AIおすすめレスポンスに `collective_summary`（jsonb）を同梱
  - `/log` では本文下に `参考にしたコミュニティ投稿` カードとして表示
  - 表示内容: カテゴリ別メニュー比率バー / 人気スケール / 自由記述（プレビュー + 展開）
  - UI文言は `集合知メモ` ではなく `参考にしたコミュニティ投稿` を使用
  - UI上は自由記述の可読性を優先し、`音域/意識/改善` のラベル文字を表示しない

## 最新差分（2026-02-28反映）
- 集合知集計のキャッシュ化
  - `Ai::CollectiveEffectCache` を新設
  - `Rails.cache` に保存（TTL 6時間）
  - キー: `collective_effects:v1:window=<window_days>:min=<min_count>`
  - `cache_hit / cache_miss` をログ出力
  - キャッシュ障害時は `build` 直実行へフォールバック（AI生成は継続）
- AIおすすめ参照期間を `14 / 30 / 90` へ拡張
  - 詳細ログ（日次）は常に直近14日
  - 30日選択時は月ログ1か月、90日選択時は月ログ3か月を傾向情報として追加
  - 同日生成の一意条件を `user_id + generated_for_date + range_days` に更新
- 録音測定データの根拠利用を追加
  - 条件: 改善タグ / 目標 / 自由記述 のいずれかに測定関連の示唆がある場合のみ
  - 指標別に直近最大10件を取得し、`latest / avg_last_5 / delta_vs_prev_5 / count` を要約
  - 過剰反応抑制の閾値を導入（音量1.0dB、音程0.1半音、ロングトーン2秒、最低音1半音）
- 当日おすすめに対するフォローアップ会話を追加
  - API: `GET /api/ai_recommendations/:id/thread`, `POST /api/ai_recommendations/:id/thread/messages`
  - 1スレッド最大20メッセージ
  - 役割は「当日のおすすめの具体化・調整」に限定

## 追加差分（2026-02-28 追記）
- AIが参照する長期プロフィール（設定可能）
  - 設定画面: `/settings/ai`
  - 保存:
    - `users.ai_custom_instructions`（回答スタイル要求）
    - `users.ai_improvement_tags`
    - `ai_user_profiles`（`auto_profile` + `user_overrides`）
  - 更新:
    - `AiUserProfileRefreshJob`（変更時）
    - `AiUserProfilesDailyRefreshJob`（日次）
  - 参照範囲: 直近90日（`source_window_days=90`）
  - 投入先:
    - `Ai::RecommendationGenerator`
    - `Ai::GeneralChatResponder`
    - （補助）`Ai::RecommendationFollowupResponder`

- AIチャット（外部知識の広さ + Koelogs個別最適）
  - 画面: `/chat`（認証必須）
  - API: `/api/ai_chat/projects`, `/api/ai_chat/threads`, `/api/ai_chat/threads/:id/messages`
  - スレッド種別:
    - 通常会話
    - おすすめ起点会話（`source_kind=ai_recommendation`, `source_date`）
  - 応答:
    - 汎用会話: `Ai::GeneralChatResponder`
    - おすすめ追質問: `Ai::RecommendationFollowupResponder`
  - 外部知識連携:
    - `Ai::WebSearchDecision` で検索発火判定
    - `Gemini::Client` の `web_search` 有効時に参照URLを抽出
    - 回答末尾に `参考情報:` を追記（取得時）
  - 優先順位:
    - 最新質問 > Koelogs内データ（長期プロフィール/ログ/おすすめ履歴） > 外部知識

## 追加差分（2026-02-27 夜）
- 推薦文の表現トーン調整
  - 「次の一手」は各項目1文で簡潔に記述
  - コミュニティ根拠文は自然で柔らかい文体に統一
    - 例: 「コミュニティの直近投稿でも、AとBが『X』に有効と報告されています。」

## 実装済み機能

### 1) コミュニティページ（`/community`）
- 閲覧はログイン不要、投稿はログイン必須
- フッタータブに「コミュニティ」を追加し、常時遷移可能
- 画面上部にランキング誘導カードを設置し、`/community/rankings` へ導線
- 一覧切替を実装
  - `投稿一覧`
  - `お気に入り`
- 並び/絞り込みを実装
  - `新着一覧`
  - `タグ別`（改善タグで絞り込み）
- 投稿導線は右下のFAB（`+ 投稿する`）からモーダルを開く方式
- 投稿カードは以下を表示
  - 効果のあったメニュー
  - 効果実感度（星）
  - 感じられた効果（タグ）
  - 自由記述（ある場合のみ）
  - 日付 / お気に入り数

### 2) 投稿の構造化
- 必須:
  - `training_menu_id`（1投稿=1メニュー）
  - `improvement_tags[]`（複数）
  - `effect_level`（1-5）
- 任意:
  - `comment`
- 永続化テーブル:
  - `community_posts`
- 投稿後挙動:
  - 一覧に即時反映
  - 自分の投稿を先頭表示（`mine_first=true`）
  - 新規投稿カードをハイライト表示

### 3) 投稿カードUI
- 各カードで以下を表示
  - 投稿者アイコン / 名前 / Lv
  - 効果のあったメニュー名
  - 実感度（星表示）
  - 効果タグ
  - 自由記述（ある場合のみ）
  - 投稿日
  - お気に入り数
- 投稿者アイコン・名前クリックで公開プロフィールへ遷移
- `☆` クリックでお気に入り登録/解除可能（ログイン必須）

### 4) お気に入り機能
- 投稿ごとにお気に入り登録を保持
- 「お気に入り」タブで自分が登録した投稿のみ閲覧
- API
  - `POST /api/community/posts/:id/favorite`
  - `DELETE /api/community/posts/:id/favorite`
  - `GET /api/community/favorites`

### 5) 公開プロフィール（集合知側参照）
- ページ: `/community/profile/:userId`
- `public_profile_enabled=true` のユーザーのみ表示
- 表示項目:
  - 連続日数
  - XP
  - バッジ
  - 目標（`public_goal_enabled=true` のときのみ）
  - AIで参考にされた数（AI貢献度）
  - アイコン（`avatar_image_url` があれば優先表示）

### 6) ランキング機能（`/community/rankings`）
- 3タブ構成
  - AI貢献
  - 連続日数
  - 直近7日練習時間
- 参加条件
  - プロフィールで「ランキングに参加する」（`ranking_participation_enabled`）をONにしたユーザー
- 現在仕様
  - 値が0のユーザーは表示しない
  - 表示順位は各指標の降順

### 7) AIおすすめへの集合知注入
- `Ai::CollectiveEffectSummary` が `community_posts` から集計
  - 集計単位: `improvement_tag × canonical_key`
  - タグごとに上位メニューを返す（最大3件）
  - 返却メニューには `top_scales`, `detail_samples`, `detail_keywords`, `detail_patterns` を含む
- `AiRecommendationsController` から `RecommendationGenerator` へ注入
- プロンプトでは、集合知使用時にコミュニティ由来が分かる説明文を必須化
  - 根拠文は `3)おすすめメニュー` 末尾に1回だけ記載
  - 推奨文型:
    - 「コミュニティの直近投稿でも、<メニューA>と<メニューB>が『<改善観点>』に有効と報告されています。」

### 8) AI貢献度
- 定義:
  - 「あなたの投稿データが、AIおすすめ生成時の根拠として採用された回数」
- カウント仕様:
  - 1推薦あたり最大1回（同一推薦内の多重採用は重複加算しない）
- 保存:
  - `ai_contribution_events`
  - ユニーク制約: `(user_id, ai_recommendation_id)`
- 表示:
  - プロフィール画面で表示
  - 文言: 「あなたのデータは◯回 AI改善根拠に使われました」

## DB設計（現時点）

### `community_posts`（新規）
- `user_id`
- `training_menu_id`
- `canonical_key`
- `improvement_tags` (jsonb)
- `effect_level` (integer 1..5)
- `comment` (text, nullable)
- `published` (boolean)
- `practiced_on` (date, nullable)
- `created_at`, `updated_at`

### `ai_contribution_events`（新規）
- `user_id`
- `ai_recommendation_id`
- `canonical_key` (nullable)
- `improvement_tags` (jsonb)
- `created_at`, `updated_at`
- unique index:
  - `idx_ai_contrib_unique_user_recommendation (user_id, ai_recommendation_id)`

### `users`（拡張）
- `public_profile_enabled` (boolean)
- `public_goal_enabled` (boolean)
- `ranking_participation_enabled` (boolean)
- `avatar_icon` (string)
- `avatar_image_url` (text, nullable)

### `community_post_favorites`（新規）
- `user_id`
- `community_post_id`
- `created_at`, `updated_at`
- unique index:
  - `(user_id, community_post_id)`

## 主要API
- `GET /api/community/posts`
  - 公開閲覧
  - `mine_first=true` で自分の投稿を先頭表示
- `POST /api/community/posts`
  - 投稿作成（ログイン必須）
- `GET /api/community/favorites`
  - 自分のお気に入り投稿一覧（ログイン必須）
- `POST /api/community/posts/:id/favorite`
  - お気に入り登録（ログイン必須）
- `DELETE /api/community/posts/:id/favorite`
  - お気に入り解除（ログイン必須）
- `GET /api/community/rankings`
  - ランキング3指標を返却（ランキング参加ONユーザーが対象）
- `GET /api/community/profiles/:id`
  - 公開プロフィール取得
- `GET /api/me`
  - `ai_contribution_count` を返却
- `PATCH /api/me`
  - `public_profile_enabled`, `public_goal_enabled`, `ranking_participation_enabled` を更新可能
  - `avatar_image_url` を更新可能
  - パスワード更新（`current_password`, `password`, `password_confirmation`）を受け付け

## 推薦文の現在ルール（集合知部分）
- 個人ログが主根拠
- 集合知は補助根拠
- 集合知を使うときは、コミュニティ由来と件数が分かる説明文を `3)おすすめメニュー` 末尾に1回だけ含める
- 集合知を使わないときは、コミュニティ説明文を出さない
- `2) 今の状態` は観測事実 + 次の一手（各点1文）で記述する

## 既知の注意点
- 投稿数が少ない初期は `min_count=3` を満たさず、集合知が `rows=[]` になりやすい
  - その場合でもAIおすすめは個人ログ根拠で生成される
- `published=false` の投稿は集計対象外
- `canonical_key` が `unknown` 系は集計対象外

## 主要ファイル
- `app/controllers/api/community_posts_controller.rb`
- `app/controllers/api/community_profiles_controller.rb`
- `app/controllers/api/community_rankings_controller.rb`
- `app/controllers/api/ai_recommendations_controller.rb`
- `app/controllers/api/me_controller.rb`
- `app/models/community_post.rb`
- `app/models/community_post_favorite.rb`
- `app/models/ai_contribution_event.rb`
- `app/services/ai/collective_effect_summary.rb`
- `app/services/ai/recommendation_generator.rb`
- `app/services/ai/contribution_tracker.rb`
- `frontend/src/pages/CommunityPage.tsx`
- `frontend/src/pages/CommunityRankingPage.tsx`
- `frontend/src/pages/CommunityProfilePage.tsx`
- `frontend/src/api/community.ts`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/features/profile/avatarIcons.ts`
- `frontend/src/components/AppFooterTabs.tsx`
- `db/migrate/20260220001000_add_community_and_public_profile.rb`
- `db/migrate/20260220103000_backfill_community_public_profile_objects.rb`
- `db/migrate/20260220131732_create_community_post_favorites.rb`
- `db/migrate/20260220020000_add_ranking_participation_enabled_to_users.rb`
- `db/migrate/20260220021000_add_avatar_image_url_to_users.rb`

## ポートフォリオで説明しやすい要点
- 集合知入力を自由記述から構造化投稿へ切り替え、再利用性を改善
- `canonical_key` と閾値で、ノイズ混入時の推薦品質低下を抑制
- 根拠文面を「コミュニティ由来 + 件数」に変更し、説明可能性を改善
- 投稿者へのAI貢献度表示で、データ提供インセンティブを設計
