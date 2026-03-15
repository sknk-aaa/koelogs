# AGENTS.md
Voice Training Web App (Koelogs)

このファイルは、このリポジトリで作業するAIエージェント（Codex等）向けの最重要ガイドラインである。
このファイルを常に最優先で遵守すること。

------------------------------------------------------------
# 0. 実行方針（重要）
------------------------------------------------------------

Codex は、ユーザーの指示に対して、的確かつ正確に従うこと。
意図を外した提案や、不要な変更、場当たり的な対応を避けること。
常に「何を求められているか」を優先し、ミスなく確実に実行すること。

実装時の基本方針：
・ユーザーの指示内容を最優先で守る
・必要のない変更を加えない
・推測で進めすぎず、既存実装と整合を取る
・一時しのぎではなく、原因を踏まえて修正する
・CSSだけの軽微修正ではビルド確認を省略してよい
・TypeScript / TSX を変更した場合のみビルド確認を行う

------------------------------------------------------------
# 1. プロジェクト概要
------------------------------------------------------------

本アプリは「ボイストレーニング記録・分析Webアプリ」である。

目的：
・日々の練習ログを記録
・練習の可視化
・直近ログと目標を元にAIがおすすめメニューを生成
・TrainingPageで録音測定し、Insightsで推移を確認できるようにする
・月単位の振り返り（月メモ + 月サマリー）を蓄積する
・コミュニティ投稿で集合知を活用する

ポートフォリオとしても重要だが、「売れるアプリ」としても作りたい。

------------------------------------------------------------
# 2. 技術スタック
------------------------------------------------------------

Backend:
- Ruby on Rails 8.1 (API mode)
- PostgreSQL
- Cookie Session 認証

Frontend:
- React 19
- TypeScript (strict)
- Vite
- React Router (BrowserRouter)

AI:
- Gemini 2.5 Flash（現行は「今日のおすすめ生成」で使用）

------------------------------------------------------------
# 3. ルーティング方針（実装準拠）
------------------------------------------------------------

## 3.1 コア動線（固定 / 最優先で維持）
以下はアプリの中心導線であり、URL・役割を維持すること。
- /            → /log にリダイレクト（固定）
- /log         : ログトップ（日/月切替、サマリー + アクション）
- /log/new     : 今日のトレーニング入力（RequireAuth）
- /training    : トレーニング音源再生 + 録音測定
- /insights    : 分析トップ

## 3.2 分析配下（許可：/insights/*）
分析ページは詳細ページを増やしてよい。
ただし /insights 配下に閉じること。
現行:
- /insights/time
- /insights/menus
- /insights/notes

## 3.3 設定・アカウント（許可：トップレベル）
設定やアカウント関連ページの追加は許可する。
ただし命名は簡潔にし、トップレベルに置く。
現行:
- /settings（RequireAuth）
- /settings/ai（RequireAuth, AIカスタム指示）
- /profile（RequireAuth）
- /mypage（RequireAuth）

## 3.4 ヘルプ（許可：/help/*）
ヘルプ系ページはログイン不要で提供してよい。
ただし /help 配下に閉じること。
現行:
- /help/guide
- /help/about
- /help/contact

## 3.5 公開ページ（固定）
認証前ページはレイアウト外で提供する。
- /login
- /signup

## 3.6 公開コミュニティ（現行）
- /community
  - ログイン不要で閲覧可能
  - 投稿 / お気に入りはログイン必須
  - 投稿一覧とお気に入りを同一ページ内で扱う
  - 「新着一覧 / タグ別 / 自分の投稿」を同一行サブタブで扱う
  - 「自分の投稿」はログイン時のみ表示（`mine_only=true` 相当）
- /community/rankings
  - ログイン不要で閲覧可能
  - 参加条件: ranking_participation_enabled=true
  - value=0 は非表示
- /community/profile/:userId
  - 公開プロフィール（public_profile_enabled=true のユーザーのみ）

## 3.7 現在の実装上の認証区分（frontend/src/App.tsx準拠）
- レイアウト外（公開）:
  - /login
  - /signup
- レイアウト内（公開）:
  - /log
  - /training
  - /insights
  - /insights/time
  - /insights/menus
  - /insights/notes
  - /community
  - /community/rankings
  - /community/profile/:userId
  - /help/guide
  - /help/about
  - /help/contact
- レイアウト内（RequireAuth）:
  - /log/new
  - /settings
  - /settings/ai
  - /profile
  - /mypage

補足：
- `/log` はクエリで表示モードを切り替える
  - `mode=day&date=YYYY-MM-DD`
  - `mode=month&month=YYYY-MM`
- 直前に開いていた `/log` のパスは localStorage に保存し、再訪時に復元する。
- `/analysis/history` は現行実装に存在しない。

------------------------------------------------------------
# 4. フロントエンド設計方針
------------------------------------------------------------

`frontend/src/App.tsx` は肥大化させない。
ルーティング定義とレイアウトに留める。

おおまかなディレクトリ構成：
- frontend/src/pages/      ← ページ単位
- frontend/src/features/   ← 機能単位で閉じ込める
- frontend/src/api/        ← API通信のみ
- frontend/src/types/      ← 型定義集約
- frontend/src/styles/     ← 共通CSS

------------------------------------------------------------
# 5. UI方針（重要）
------------------------------------------------------------

UIは必ず以下を守る：

・見た目が良くなるようにする。
・ポートフォリオとして見たときに印象が良くなるように。
・同一アプリ内でデザイン文法（角丸・影・余白・階層）を統一する。
・グラデーションを使用しない。
・カードの中に別カードを入れるような多重カード構造を作らない。


------------------------------------------------------------
# 6. Backend設計思想
------------------------------------------------------------

中心は「1日1ログ + 月振り返り + 測定記録 + コミュニティ」である。

主なテーブル（db/schema.rb 準拠）：

- training_logs
  - user_id
  - practiced_on (user単位でunique)
  - duration_min
  - notes

- training_log_menus
  - user_id
  - training_log_id
  - training_menu_id
  - (training_log_id + training_menu_id は一意)

補足:
- `training_log_feedbacks` は廃止済み（現行実装では使用しない）。

- training_menus
  - user_id
  - name (user単位でunique)
  - color
  - archived (論理削除)
  - canonical_core_key / canonical_register / canonical_key
  - canonical_confidence / canonical_source / canonical_version

- menu_aliases（メニュー表記ゆれの正規化辞書）
  - normalized_name (unique)
  - canonical_key
  - confidence
  - source
  - first_seen_at / last_seen_at

- monthly_logs（月振り返り）
  - user_id
  - month_start (user単位でunique)
  - notes

- measurement_runs（録音測定の実行単位）
  - user_id
  - measurement_type (range / long_tone / volume_stability / pitch_accuracy)
  - include_in_insights
  - recorded_at

- measurement_range_results
  - measurement_run_id (unique)
  - lowest_note / highest_note
  - chest_top_note / falsetto_top_note
  - range_semitones / range_octaves

- measurement_long_tone_results
  - measurement_run_id (unique)
  - sustain_sec
  - sustain_note

- measurement_volume_stability_results
  - measurement_run_id (unique)
  - avg_loudness_db / min_loudness_db / max_loudness_db
  - loudness_range_db / loudness_range_ratio / loudness_range_pct

- measurement_pitch_accuracy_results
  - measurement_run_id (unique)
  - avg_cents_error / accuracy_score / note_count

- ai_recommendations
  - generated_for_date（`user_id + generated_for_date + range_days` で一意）
  - range_days
  - recommendation_text
  - collective_summary（jsonb, 推薦時に参照したコミュニティ要約UI用）
  - generation_context（jsonb, 生成時入力スナップショット）
  - generator_model_name / generator_prompt_version

- ai_recommendation_threads（おすすめ後の会話スレッド）
  - user_id
  - ai_recommendation_id（1推薦につき1スレッド）
  - generated_for_date
  - context_snapshot（jsonb）
  - seed_recommendation_text
  - llm_model_name / system_prompt_version / user_prompt_version

- ai_recommendation_messages（おすすめ後会話メッセージ）
  - ai_recommendation_thread_id
  - role（user / assistant）
  - content

- scale_tracks（トレーニング用音源管理）
  - scale_type（現行: 5tone / triad / Descending5tone / octave / Risingoctave）
  - range_type（low / mid / high）
  - tempo（DB保持のみ。TrainingPageの選択UIでは使用しない）
  - file_path

- users
  - email : 必須、ユニーク
  - email_verified_at : メール確認完了時刻
  - email_verification_token_digest / email_verification_sent_at
  - display_name : 任意、最大30文字
  - goal_text : 任意、最大50文字
  - ai_custom_instructions : 任意、最大600文字
  - ai_improvement_tags : jsonb配列（改善したい項目）
  - ai_response_style_prefs : jsonb（`style_tone/warmth/energy/emoji`）
  - avatar_icon : 必須（プリセットキー）
  - avatar_image_url : 任意（カスタム画像URL / data URL）
  - public_profile_enabled : boolean
  - public_goal_enabled : boolean
  - ranking_participation_enabled : boolean
  - google_sub : Googleログイン時の subject（unique, nullable）
  - password_digest : 必須（has_secure_password）
  - password_reset_token_digest / password_reset_sent_at

- community_posts（集合知投稿）
  - user_id
  - training_menu_id
  - canonical_key
  - improvement_tags（jsonb）
  - effect_level（1..5）
  - used_scale_type（`five_tone` / `triad` / `one_half_octave` / `octave` / `octave_repeat` / `semitone` / `other`）
  - used_scale_other_text（任意）
  - comment（任意）
  - published（boolean）
  - practiced_on（任意）

- community_post_favorites（投稿お気に入り）
  - user_id
  - community_post_id
  - (user_id + community_post_id は一意)

- ai_contribution_events（AI貢献イベント）
  - user_id
  - ai_recommendation_id
  - canonical_key
  - improvement_tags（jsonb）
  - (user_id + ai_recommendation_id は一意)

- ai_profile_memory_candidates（チャット由来の保存候補）
  - user_id
  - source_kind / source_thread_id / source_message_id
  - source_text / candidate_text
  - suggested_destination / resolved_destination
  - status（`pending/saved/dismissed`）
  - expires_at / resolved_at

- xp_events / user_badges（ゲーミフィケーション）

------------------------------------------------------------
# 7. バックエンドAPI（現行）
------------------------------------------------------------

定義元: `config/routes.rb`

- 認証/ユーザー
  - POST /api/auth/signup
  - POST /api/auth/login
  - POST /api/auth/google
  - POST /api/auth/logout
  - POST /api/auth/email_verification_requests
  - POST /api/auth/email_verifications
  - POST /api/auth/password_reset_requests
  - POST /api/auth/password_resets
  - GET /api/me
  - PATCH /api/me
    - AI設定保存項目を含む（`ai_custom_instructions`, `ai_improvement_tags`, `ai_response_style_prefs`, `ai_long_term_profile`）
  - GET /api/me/ai_memory_candidates
  - PATCH /api/me/ai_memory_candidates/:id

- ログ/メニュー
  - GET /api/training_logs
  - POST /api/training_logs
  - GET /api/monthly_logs
  - POST /api/monthly_logs
  - GET /api/training_menus
  - POST /api/training_menus
  - PATCH /api/training_menus/:id

- 測定/分析
  - GET /api/measurements
  - GET /api/measurements/latest
  - POST /api/measurements
  - PATCH /api/measurements/:id
  - GET /api/insights

- AIおすすめ
  - GET /api/ai_recommendations
  - POST /api/ai_recommendations
  - GET /api/ai_recommendations/:id/thread
  - POST /api/ai_recommendations/:id/thread/messages

- AIチャット
  - GET /api/ai_chat/projects
  - POST /api/ai_chat/projects
  - PATCH /api/ai_chat/projects/:id
  - DELETE /api/ai_chat/projects/:id
  - GET /api/ai_chat/threads
  - POST /api/ai_chat/threads
  - GET /api/ai_chat/threads/:id
  - PATCH /api/ai_chat/threads/:id
  - DELETE /api/ai_chat/threads/:id
  - POST /api/ai_chat/threads/:id/messages

- コミュニティ
  - GET /api/community/posts（`mine_first` / `mine_only` フィルタ対応）
  - POST /api/community/posts
  - PATCH /api/community/posts/:id（本人投稿のみ更新可）
  - DELETE /api/community/posts/:id（本人投稿のみ削除可）
  - GET /api/community/favorites
  - POST /api/community/posts/:id/favorite
  - DELETE /api/community/posts/:id/favorite
  - GET /api/community/rankings
  - GET /api/community/profiles/:id

- その他
  - GET /api/scale_tracks
  - POST /api/help/contact

------------------------------------------------------------
# 8. AI機能のルール
------------------------------------------------------------

AIは現行では以下に使用する：

・今日のおすすめ生成
・当日おすすめに対するフォローアップ会話（調整/具体化）
・汎用AIチャット（/chat）
・チャット由来の保存候補抽出/正規化/分類

ルール：
・参照期間は `14 / 30 / 90` を選択可能（デフォルトは14）
・生成後はDB保存
・同日同条件の再生成はしない（`user_id + generated_for_date + range_days`）
・目標（goal_text）があれば考慮する
・APIは date 指定を受け付ける（UI上の生成導線は当日中心）

AIおすすめ（現状仕様）：
- 最終更新メモ: 2026-02-28（集合知キャッシュ / 参照期間14-30-90 / 測定根拠連携 / 会話スレッド）
- 個人ログ（練習時間 / メニュー / メモ）を主根拠にする
- 日次ログ（詳細）は常に直近14日を使用
- 月次ログ（傾向）は range_days に応じて利用
  - 14日: 月次ログなし（任意）
  - 30日: 直近1か月の月ログ
  - 90日: 直近3か月の月ログ
- AIカスタム指示を最優先で反映する
  - 保存先: `users.ai_custom_instructions`
- AI設定の改善したい項目（効果タグ）を反映する
  - 保存先: `users.ai_improvement_tags`
- 集合知を補助根拠として使用する
  - 元データ: community_posts（published=true）
  - 投稿必須項目: menu(1投稿=1メニュー) / improvement_tags(複数) / used_scale_type
  - 投稿任意項目: comment / used_scale_other_text
  - 集計単位: improvement_tag × canonical_key
  - 集計条件: 直近90日、min_count=3、unknown系は除外
  - 集計出力（AI入力）: 上位メニュー / 上位スケール / 自由記述サンプル / 頻出語句 / テンプレ項目別要点（改善・音域・意識）
  - キャッシュ: `Rails.cache`（6時間TTL）
  - キー: `collective_effects:v1:window=<days>:min=<count>`
  - 例外時: キャッシュ失敗でも `build` 直実行で継続（生成を止めない）
- プロンプト内の優先順位:
  - 1) カスタム指示
  - 2) goal_text
  - 3) AI設定の改善したい項目
  - 4) 直近ログ・集合知
- 録音測定結果を根拠に使うのは次の場合のみ
  - 改善タグ / 目標 / 直近自由記述 のいずれかに測定関連の示唆があるとき
- 測定根拠サマリ仕様（指標別）
  - 直近10件取得、サマリは latest / avg_last_5 / delta_vs_prev_5 / count
  - count 0: 参照しない
  - count 1: latestのみ
  - count 2〜4: latest + 平均（比較なし）
  - count 5以上: 前5回比較を含む
- 無視閾値（過剰反応防止）
  - 音量安定性: ±1.0 dB
  - 音程精度: 0.1半音
  - ロングトーン: 2.0秒
  - 音域（最低音）: 1.0半音
- 集合知を根拠に使う場合は、コミュニティ由来の根拠文を `3)おすすめメニュー` の末尾に1回だけ入れる
- 出力フォーマット要件:
  - `2) 今の状態` は観測事実 + 次の一手で記述し、`不足/足りない` 表現を避ける
  - `3) おすすめメニュー` は各項目2行固定（1行目: メニュー名｜時間 / 2行目: 狙い1文）
- 文面トーン要件（最新）:
  - 「次の一手」は1文に圧縮する
  - コミュニティ根拠文は自然な日本語で記述する（断定・硬すぎる定型を避ける）
- UI表記（/log のAIカード下）:
  - 集合知表示の見出しは `参考にしたコミュニティ投稿` を使用する
- 出力はプレーンテキスト（Markdown禁止）

フォローアップ会話（当日おすすめの質問）：
- 対象: 当日生成されたおすすめのみ
- 目的: おすすめ本文の具体化・調整（再生成は対象外）
- 上限: 1スレッド最大20メッセージ
- コンテキスト: 直近6往復（12件）を投入
- 保存:
  - 生成時データスナップショット（`ai_recommendations.generation_context`）
  - 元おすすめ本文（thread.seed_recommendation_text）
  - 会話ログ（ai_recommendation_messages）
  - モデル/プロンプトバージョン（threadカラム）
- 安全ガード:
  - 医療断定禁止
  - 不適切要求はテンプレ応答
  - 大幅変更要求は再生成案内テンプレ応答

AI貢献度（プロフィール表示）：
- 定義: 「あなたの投稿データが、AIおすすめ生成時の根拠として採用された回数」
- カウント単位: 1推薦あたり最大1回（同一推薦内の多重採用は重複加算しない）

補足：
- `analysis_sessions` / `analysis_menus` / `/analysis/history` は現行実装に存在しない。
- 録音測定データは「AI録音分析」機能ではなく、AIおすすめ生成の根拠補助として利用する。

------------------------------------------------------------
# 9. 測定機能（TrainingPage）
------------------------------------------------------------

測定は TrainingPage で実施し、日々のメモ記録は /log で扱う。

現行の測定種別：
- 音域（range）
- ロングトーン（long_tone）
- 音量安定性（volume_stability）
- 音程精度（pitch_accuracy）

録音中UI：
- 音域 / ロングトーン / 音程精度
  - 縦軸=音程、横軸=時間の推移グラフ
  - 上部に簡易チューナー帯（cent / note / Hz）
  - 背景は半音ごとの白黒帯（交互）で表示する
- 音量安定性
  - dBドーナツメーター（現在値）
  - 最小/平均/最大 dB
  - 縦軸=dB、横軸=時間の推移グラフ

音程精度（pitch_accuracy）の追従測定：
- 録音開始と同時に固定ガイド音源を再生する
  - `public/scales/pitch_accuracy-low.mp3`
  - `public/scales/pitch_accuracy-mid.mp3`
  - `public/scales/pitch_accuracy-high.mp3`
- 参照バー（ターゲット音程）を時間軸上に描画し、現在位置を縦のプレイヘッドで示す
- 発声音程ラインはリアルタイムで描画し、無音区間は線を分断する（ワープ表示を防ぐ）

測定API/保存ルール：
- 測定保存APIは `POST /api/measurements` を使用。
- 検出不足時は保存前ガードで API 呼び出しを抑止し、UIに理由を表示する。
- 録音ファイル自体は保存しない。

録音時の同時再生トグル：
- UI表示は `volume_stability` と `pitch_accuracy` のときのみ。

ノイズ閾値の運用（frontend/src/pages/TrainingPage.tsx）：
- `NOISE_DB_THRESHOLD = -140`
- `MIN_VOICED_STREAK_FRAMES = 1`
- 本番相当値へ戻す際は上記定数と `autoCorrelate` 内のRMS下限を合わせて調整する。

------------------------------------------------------------
# 10. コーディング規約
------------------------------------------------------------

必須：

- TypeScript strict前提
- any禁止
- 使われない変数を残さない
- 不要なuseEffect禁止
- setStateをeffect内で同期実行しない

変更時は必ず：

- 既存挙動を壊さない
- 関係ないファイルを触らない

------------------------------------------------------------
# 11. このプロジェクトの本質
------------------------------------------------------------

このアプリは就活用のポートフォリオです。

重要なのは：
・設計の一貫性
・堅牢
・理由ある実装
・無駄のない変更履歴

# 12. 変更ポリシー
どんどん変えてよい。ただしルーティングは維持すること。
コミットとgit addはユーザー側で行うため、エージェントは実行しないこと。

------------------------------------------------------------
# 13. 最新確定仕様（2026-02-28時点）
------------------------------------------------------------

この節は、上記の旧記述と矛盾する場合に最優先で採用する。

- 実装準拠の単一仕様書は `docs/CURRENT_IMPLEMENTATION_SPEC_2026-02-28.md` を正とする。
- 旧ドキュメント（`README.md` や `docs/DEVLOG_*`, `docs/WEEKLY_LOG_IMPLEMENTATION.md`）は履歴情報として扱う。
- 仕様判断に迷った場合は、必ず実コード（`frontend/src/App.tsx`, `config/routes.rb`, `db/schema.rb`）を確認してから変更する。

------------------------------------------------------------
# 14. 最新UI実装追記（2026-02-23反映）
------------------------------------------------------------

この節は、説明UI / 導線UIの最新実装を示す。
本節と旧記述が矛盾する場合は、本節を優先する。

## 14.1 共通説明モーダル（InfoModal）
- 共通コンポーネント:
  - `frontend/src/components/InfoModal.tsx`
  - `frontend/src/components/InfoModal.css`
- 仕様:
  - トリガーは `ⓘ` ボタン
  - モーダル本体は `createPortal` で `document.body` 配下に描画する
  - `triggerClassName` / `bodyClassName` でページごとに見た目調整する
  - 背景クリックと `Esc` で閉じる
  - オープン中は body スクロールをロックする

## 14.2 /mypage の説明UI
- 「進捗」カード右上に `ⓘ` を表示（XP説明）
- 内容:
  - XPは継続記録ポイント
  - ログ作成/測定/投稿で増加
  - 上達保証ではなく継続の可視化
- 実装箇所:
  - `frontend/src/pages/MyPage.tsx`
  - `frontend/src/pages/MyPage.css`

## 14.3 /log の説明UIとAI導線
- 目標未入力時のみ、目標欄に1行ヒントを表示:
  - 「目標を設定すると『今日のおすすめメニュー』に反映されます。」
- AI作成導線は `logAi` 系カードで表示（ボタン単体表示ではない）
  - ヘッダー: タイトル/メタ/状態ピル/ⓘ
  - コンテンツ: 主要CTAボタン
  - ゲスト時補足: mutedテキストをカード内に表示
- AI説明モーダル（`おすすめは何をもとに作られますか？`）は次の構成:
  - Lead（導入）
  - 主に使う（主役ブロック）
  - 補助（サブブロック）
  - 保存（最も控えめ）
  - アイコンは固定サイズで整列
- 主役表現は「構造優先」:
  - 3ブロックの背景トーンは統一
  - 「主に使う」だけ左3pxアクセントライン + タイトル強調
- 実装箇所:
  - `frontend/src/pages/LogPage.tsx`
  - `frontend/src/pages/LogPage.css`

## 14.4 /community 上部説明カード
- 上部に常時表示の説明カードを配置（情報カード化済み）
  - バッジ（コミュニティ）
  - Lead / Sub / Note の3段構成
  - 右上に `ⓘ`（InfoModalトリガー）
- 文章:
  - Lead: ここでは「練習メニューの効果」を共有・閲覧できます。
  - Sub: 投稿はAIの分析にも活用され、「AIおすすめメニュー」の精度向上に反映されます。
  - Note: あなたの投稿が、みんなの練習をより良くします。
- `ⓘ` モーダルは2セクション構成:
  - みんなの練習（閲覧/投稿/お気に入り）
  - みんなの進捗（ランキング説明）
- 実装箇所:
  - `frontend/src/pages/CommunityPage.tsx`
  - `frontend/src/pages/CommunityPage.css`

## 14.5 コミュニティ効果タグの色ルール
- 投稿表示タグと投稿フォーム選択チップは同一色ルールで表示する
- タグ色判定は `CommunityPage.tsx` 内の共通関数で管理する
- 現行キー:
  - `high_note_ease`
  - `range_breadth`
  - `pitch_accuracy`
  - `passaggio_smoothness`
  - `less_breathlessness`
  - `volume_stability`
  - `less_throat_tension`
  - `resonance_clarity`
  - `long_tone_sustain`
- 表示ラベル:
  - `volume_stability` は「音量安定性」で表示する
- 互換運用:
  - 旧キー `pitch_stability` は既存データ互換のため受理し、表示時は「音程精度」へ寄せる
- 実装箇所:
  - `frontend/src/pages/CommunityPage.tsx`
  - `frontend/src/pages/CommunityPage.css`

## 14.6 /community 投稿カード操作UI（2026-02-24反映）
- 投稿カード右上に `⋯` メニューを追加
  - 項目: `編集` / `削除`
  - 表示条件: ログイン中かつ本人投稿（`post.user_id === me.id`）のみ
  - 表示対象: 新着一覧 / タグ別 / 自分の投稿 のいずれでも同様
- 編集:
  - 既存の「投稿する」モーダルを流用して更新する（新規ページ追加なし）
  - 更新成功後は一覧を再取得し、UIへ即時反映
- 削除:
  - 確認ダイアログ必須
  - 削除成功後は一覧を再取得し、UIへ即時反映
- 実装箇所:
  - `frontend/src/pages/CommunityPage.tsx`
  - `frontend/src/pages/CommunityPage.css`
  - `frontend/src/api/community.ts`
  - `app/controllers/api/community_posts_controller.rb`

## 14.7 練習時間ヒートマップのダークモード（2026-02-24反映）
- `DurationHeatmapCalendar` のダークテーマ配色を追加
  - 背景/枠線/文字色をダーク対応
  - `level-0..4` のマス色コントラストを再調整（可読性優先）
- 実装箇所:
  - `frontend/src/features/insights/components/DurationHeatmapCalendar.css`

## 14.8 /help/contact（お問い合わせページ）
- ルート:
  - `GET /help/contact`（ログイン不要、Layout内）
- 送信:
  - `POST /api/help/contact`
  - 既存メール送信基盤（SMTP）を流用
- フォーム:
  - 種別 / メールアドレス / 件名（最大80）/ 本文（最大1000）
  - 文字数は「現在文字数 / 上限」で表示
- 実装箇所:
  - `frontend/src/pages/HelpContactPage.tsx`
  - `frontend/src/pages/HelpContactPage.css`
  - `app/controllers/api/help_contacts_controller.rb`

## 14.9 /settings/ai（AIカスタム指示）
- ルート:
  - `GET /settings/ai`（RequireAuth）
- 画面構成:
  - AIが参照する長期プロフィール（声に関して: 強み/課題/成長過程/避けたい練習/注意点）
  - 回答スタイル（カスタム指示 + 構造化スタイル `style_tone/warmth/energy/emoji`）
  - 改善したい項目（効果タグチップ複数選択）
  - AIおすすめの参照期間（14/30/90）
  - 画面下部固定の保存ボタン
- 保存先:
  - `users.ai_custom_instructions`
  - `users.ai_improvement_tags`
  - `users.ai_response_style_prefs`
  - `ai_user_profiles.user_overrides`（長期プロフィール編集）
- 動線:
  - ハンバーガーメニューに「AIカスタム指示」
  - `/log` のAIカード近傍に「AIカスタム指示」リンク
- 実装箇所:
  - `frontend/src/pages/AiSettingsPage.tsx`
  - `frontend/src/pages/AiSettingsPage.css`
  - `app/controllers/api/me_controller.rb`

## 14.10 /training 音源選択UI（2026-02-26反映）
- トレーニング音源は `scale_type × range_type` の組み合わせで選択する
  - range_type: `low` / `mid` / `high`
- テンポ選択UIは廃止
  - 音源テンポはファイル側で固定
  - アプリ側でテンポ選択・表示を行わない
- 音源ファイル命名:
  - `public/scales/{scale_type}-{range_type}.mp3`
  - 例: `5tone-low.mp3`, `triad-mid.mp3`, `octave-high.mp3`
- scale preview（`scalePattern__svg`）:
  - `octave` は octaveパターン
  - `Descending5tone` / `Risingoctave` / `triad` は専用パターン
  - その他は 5toneパターン
- 実装箇所:
  - `frontend/src/pages/TrainingPage.tsx`
  - `frontend/src/features/training/components/AudioPlayer.tsx`
  - `frontend/src/features/training/components/ScalePatternPreview.tsx`
  - `frontend/src/api/scaleTracks.ts`
  - `db/seeds.rb`

## 14.11 レベルアップ演出 / テーマカラー開放（2026-02-27反映）
- レベルアップ演出:
  - 全ページ共通Layoutに `LevelUpToast` を配置し、どのページでも表示可能
  - 発火条件は `localStorage.last_seen_level` と現在レベル比較で「1レベルにつき1回」
  - 複数レベル上昇時は1回に集約（例: Lv10→Lv12）
  - 表示は非ブロッキングトースト（自動5秒で閉じる、`×`で手動クローズ可能）
  - 紙吹雪はトースト領域内のみ、粒数少なめ、表示時間は5秒以内
- テーマカラー開放:
  - 設定画面のテーマカラーはレベル条件で開放される
  - 開放レベル:
    - `Violet`: Lv5
    - `Canary`: Lv10
    - `Umber`: Lv20
  - テーマカードの表示順は `Violet / Canary / Umber` を末尾に固定する
  - ダークモード選択中はテーマカラーを変更不可（UI上で非活性+説明表示）
- 実装箇所:
  - `frontend/src/features/theme/themes.ts`
  - `frontend/src/features/theme/themeUnlock.ts`
  - `frontend/src/features/theme/ThemeProvider.tsx`
  - `frontend/src/pages/SettingsPage.tsx`
  - `frontend/src/layout/AppLayout.tsx`
  - `frontend/src/components/LevelUpToast.tsx`

## 14.12 /log 月ログ「先月との比較」モーダル（2026-03反映）
- 月ログの比較UIは画面内の縦積み表示ではなく、比較モーダル導線から開く方式
  - 導線位置: 月ナビ直下（4枚サマリーカードの上）
  - 導線文言: `先月との比較（コーチ診断）`
- 比較対象:
  - 練習時間（今月 vs 先月）
  - メニュー実施量（今月 vs 先月）
  - 測定結果（音域/ロングトーン/音量安定性/音程精度）
- 測定比較は「最高同士」を基本表示とし、差分と成長率（%）を出す
- 停滞箇所は診断上の重要情報として明示する
- 主要表示順:
  - 今月の診断（結論）
  - 比較サマリー（理由）
  - 実力変化（詳細）
- 実装箇所:
  - `frontend/src/pages/LogPage.tsx`
  - `frontend/src/pages/LogPage.css`

## 14.13 /insights CSV出力UI（2026-03反映）
- Insights上部帯の右端に `CSV` ボタンを配置（カード内設置は禁止）
- CSVモーダルで以下を選択可能:
  - 期間: `最新` / `30日` / `90日`
  - 指標フィルタ: `すべて` / `音域` / `ロングトーン` / `音量安定性` / `音程精度`
- 出力形式は単一選択ではなく「日次サマリーCSV + 測定履歴CSV」の2ファイル同時出力を標準とする
- ダウンロード時は2ファイルを出力:
  - 日次サマリーCSV
  - 測定履歴CSV
- ゲスト表示時もサンプルデータでCSV出力可能
- 実装箇所:
  - `frontend/src/pages/InsightsPage.tsx`
  - `frontend/src/features/insights/components/ExportCsvDialog.tsx`
  - `frontend/src/pages/InsightsPages.css`

## 14.14 Premium誘導モーダル共通ベース（2026-03-02反映）
- 共通コンポーネント:
  - `frontend/src/components/PremiumUpsellModal.tsx`
  - `frontend/src/components/PremiumUpsellModal.css`
- 方針:
  - 月ログ比較で確定したLPデザインを「課金モーダルのベース」として再利用する
  - 各機能（/log, /chat, /insights, /insights/notes, /training）は同一ベースを使い、文言のみ差し替える
- 使用ルール:
  - `variant="lp"` を指定
  - `flowTitle` / `flowSteps` で縦フロー（3ステップ）を定義
  - `growthTitle` / `growthItems` は月ログ比較など必要な画面のみ使用
  - CTA文言は機能ごとに変更可能だが、遷移/課金ロジックは変更しない
- 現在の注意:
  - 旧 `featuresTitle` / `features` は廃止済み
  - モーダル表示中は `premiumModal--open` によりヘッダー/モードタブを非表示化する

## 14.15 認証: メール確認 / Googleログイン（2026-03-13反映）
- メール登録:
  - `POST /api/auth/signup` は即ログインしない
  - 登録後に確認メールを送信し、フロントは `/login` へ戻す
  - 文言は「確認メールを送信しました。メール内のリンクを開いて登録を完了してください。」
- メール確認:
  - `POST /api/auth/email_verification_requests`
  - `POST /api/auth/email_verifications`
  - メール確認トークン TTL は `24時間`
  - 再送間隔は `1分`
  - 未確認ユーザーは `POST /api/auth/login` で拒否する
    - code: `email_not_verified`
- 既存ユーザー保護:
  - `email_verified_at` 導入 migration では既存 users を backfill する
  - 既存ログインを壊さないこと
- Googleログイン:
  - `POST /api/auth/google`
  - frontend は Google Identity Services の credential を送る
  - backend は `googleauth` で ID token を検証する
  - 同一メールの既存ユーザーがいれば `google_sub` を紐づける
  - 新規 Google ユーザーは `email_verified_at` 済みで作成する
  - `payload.email_verified` が truthy の場合のみ受け入れる
- 環境変数:
  - backend: `GOOGLE_CLIENT_ID`
  - frontend: `VITE_GOOGLE_CLIENT_ID`
- 関連ファイル:
  - `app/controllers/api/auth_controller.rb`
  - `app/services/google_id_token_verifier.rb`
  - `app/services/google_authenticator.rb`
  - `frontend/src/components/GoogleSignInButton.tsx`
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/SignupPage.tsx`

------------------------------------------------------------
# 15. UI大改修ポリシー
------------------------------------------------------------

現在、本アプリはUI/UXの大規模改修フェーズにある。

目的：
・デザイン統一
・UX改善
・モバイルアプリ化を見据えたUI設計
・ポートフォリオ品質向上

このフェーズでは以下を許可する：

・ページUIの全面変更
・コンポーネント構造の再設計
・CSSの大規模整理
・UI関連ファイルの広範囲変更

ただし以下は維持すること：

・ルーティング構造
・API構造
・DBスキーマ
・主要機能

つまり

「見た目・UI構造は自由に改善してよいが、
アプリの機能構造は維持する」

という方針とする。

------------------------------------------------------------
# 16. 共通UI世界観ルール（2026-03反映）
------------------------------------------------------------

この節は、今後 `/log` 以外のページにも同じ世界観を適用するための共通UIルールである。
他ページをデザインするときも、この節を優先して参照すること。

## 16.1 デザイン思想
- ベースは白背景のミニマルUI
- iOS系の軽さ・静けさを優先する
- SaaSダッシュボード/管理画面のような重い見た目は避ける
- 情報の区切りは「枠」より「余白」で見せる
- UIの主役は装飾ではなくデータと記録内容

## 16.2 禁止事項
- グラデーションを使わない
- カードを多重にしない
- 不要な影を付けない
- 装飾のためだけの強い色面を増やさない

## 16.3 世界観の核
- 英語大文字のセクション見出しを主要セクションで使う
- セクション見出しの横には小さい outline icon を置く
- テーマカラーはシアン系1色を基準にする
- 白ベース + 線アイコン + 抑えた色数で世界観を作る

## 16.4 セクション見出しルール
- 主要セクションのみ英語大文字見出しを使う
- セクション見出しは同一フォント感・同一余白・同一アイコンサイズで統一する
- 色はテーマカラーを少し混ぜたグレー寄りにする
- セクション内タイトルは必要以上に重ねない
- 英語見出しの直下に同義の日本語タイトルを重ねない
- 見出しの役割は「ページ内の骨格の提示」であり、説明ではない

## 16.5 カード/面のルール
- カードは原則 `background: white`
- `border: none`
- `box-shadow: none`
- `border-radius: 16px`
- カードの情報密度は `padding: 16px〜20px` を基準にする
- カードで見せるより、面と余白で見せることを優先する
- 主要ページでは、そもそもカード化しない構成を優先する
- 独立感が必要な記録ブロックのみ白い面として扱う

## 16.6 角丸ルール
- 角丸は原則2種類のみ
  - セクションカード/面: `16px`
  - pill/ボタン/選択チップ/丸UI: `999px`

## 16.7 カラー設計
- テーマカラーは原則1色のみを共通アクセントとして使う
- テーマカラーの使用箇所:
  - アイコン
  - ボタン
  - 選択状態
  - グラフ/進捗
- それ以外は黒・グレー中心で構成する
- 機能ごとの補助色を使う場合も、テーマカラーを上書きしない
- 強い色は「状態」か「意味」がある時だけ使う

## 16.8 アイコンルール
- すべて outline icon を基本とする
- `stroke-width` は同一画面内で統一する
- fill は原則使わず、必要なアクセントにだけ限定する
- アイコンは識別記号であり、主役にしない
- アイコンサイズは見出し・フッター・補助導線で文法を揃える

## 16.9 タイポグラフィ
- フォント自体より、weight/size/letter-spacing のルールを優先する
- 目安:
  - section title: `18px` 前後
  - body: `16px`
  - subtext: `14px`
  - caption: `12px〜13px`
- 主値は `28px` 前後 / `700`
- 単位は小さく弱く表示する
- ラベルは弱く、値は強くする
- 同じ強さの文字を並べない
- 完全な黒を多用せず、濃い青緑グレー寄りも使う

## 16.10 余白ルール
- 要素間: `12px` 基準
- カード内: `16px` 基準
- セクション間: `24px〜32px`
- 情報の区切りは枠線より余白差で見せる
- ただし「まとまった情報区間」が連続するページでは、各セクション末尾にごく薄い下線を入れてよい
- 下線を入れる場合も主役は余白であり、罫線は存在を主張しない薄さに抑える

## 16.11 ボタン/導線ルール
- ボタンは pill 型を基本とする
- `border-radius: 999px`
- padding は軽めにする
- 強いCTAを乱発しない
- 編集/記録などの補助導線は、可能なら文字より小さいアイコンで見せる
- リンク導線は軽く見せる（例: `→` 付きのテキスト導線）

## 16.12 情報配置ルール
- 基本は縦積みより横配置を優先する
- 1ブロックにつき主値は1つに絞る
- 補助情報は静かにまとめ、主値を邪魔しない
- 迷ったら情報を減らす方向を優先する

## 16.13 グラフ/可視化ルール
- 装飾的なグラフではなく、フラットで意味の明確な可視化を使う
- 影・立体・派手な装飾は使わない
- ラベルは最小限にし、意味が分かる範囲で簡潔にする
- グラフ色はテーマカラーまたは意味のある機能色に限定する

## 16.14 背景アート/装飾ルール
- 背景アートは必要なセクションだけに使う
- 右上または右下にはみ出す配置を基本とする
- 透明度はかなり低く、情報より目立たせない
- 装飾のためだけに増やさず、画面内で使い方を統一する

## 16.15 ミニマル化の判断基準
- 迷ったら足すより削る
- カードを減らせるなら減らす
- 説明文を減らせるなら減らす
- ページタイトルの補助ラベルが主タイトルと重複するなら削る
- 主タイトルに色を入れる場合も、テーマカラーをほんの少し混ぜる程度に留める
- ただし意味が失われるなら戻す
- 装飾より、レイアウト・余白・タイポグラフィで完成度を出す

## 16.16 2026-03 共通トークン追記
- 英語タイトル色は `/log` 基準で共通化する
- 見出しの画像アイコン色も `/log` 基準で共通化する
- `/log` の `提案を見る` 系の強め文字色は共通トークン `--ui-accent-strong` を使う
- `/log` の `logPage__contentInner--measure` 背景色は共通トークン `--ui-measure-section-bg` を使う
