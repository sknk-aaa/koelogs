# AI機能 全体設計・運用まとめ（2026-03-01）

最終更新: 2026-03-06

このドキュメントは、Koelogs のAI機能全体（おすすめ生成 / フォローアップ会話 / 汎用AIチャット / 長期プロフィール / 外部知識連携）の現行実装を1枚で把握するための要約です。

## 1. 全体像

- AI機能は大きく3系統
  - AIおすすめ生成（`/log`）
  - おすすめへの追質問チャット（おすすめ起点スレッド）
  - 汎用AIチャット（`/chat`）
- 共通で使うユーザーデータ
  - 直近ログ（日次/月次）
  - 目標（`goal_text`）
  - AI設定（回答スタイル指示 + 構造化スタイル + 改善タグ + 参照期間）
  - 長期プロフィール（自動要約 + ユーザー編集）
- 補助データ
  - コミュニティ集合知（キャッシュ付き）
  - 必要時のみ外部Web検索
  - 内部用語辞書（誤答抑制）

## 2. AIおすすめ生成（/log）

### 2.1 参照期間

- `range_days=14`: 日次ログ14日（詳細）
- `range_days=30`: 日次ログ14日 + 月ログ1か月（傾向）
- `range_days=90`: 日次ログ14日 + 月ログ3か月（傾向）
- 参照期間設定UIは ` /settings/ai ` に配置（Settings一般画面とLog画面からは撤去済み）

### 2.2 保存単位

- 週キー: `week_start_date`（月曜開始）
- 同日生成の一意条件: `user_id + generated_for_date + range_days`
- 取得は「指定日の属する週（`week_start_date`）の最新1件」
- 生成は手動ボタン押下時のみ。**同日同条件の再生成はしない**（`1日1回`）

### 2.3 根拠優先順位

1. `users.ai_custom_instructions`（回答スタイル要求）
2. `users.goal_text`
3. `users.ai_improvement_tags`
4. 直近ログ + 集合知 +（条件一致時）測定要約

### 2.4 集合知利用（テーマ連動）

- 集計元: `community_posts(published=true)`
- キャッシュ: `Ai::CollectiveEffectCache`
  - キー: `collective_effects:v1:window=<window_days>:min=<min_count>`
  - テーマ語一致時はタグ条件を含むキー（`...:tags=<tag,...>`）
  - TTL: 6時間
  - ログ: `cache_hit` / `cache_miss`
  - 障害時: キャッシュをバイパスして直集計し、生成継続（フェイルオープン）
- コミュニティ参照ON条件（`today_theme`に次の語を含む場合のみ）
  - `音域 / 音程 / 換声点 / 息切れ / 音量 / 力み / 声の抜け / ロングトーン`
- 条件不一致（またはテーマ未入力）時はコミュニティ参照OFF（Webのみ）

### 2.5 測定結果利用

- 参照条件: 「改善したい項目 / 目標 / 自由記述」に測定関連の示唆がある場合のみ
- 指標ごとに直近最大10件を要約
  - `latest`
  - `avg_last_5`
  - `delta_vs_prev_5`
  - `count`

### 2.6 ユーザー指定テーマ（固定）

- `/log` の「今週のテーマ（任意）」入力を `today_theme` として受け取る
- テーマ指定がある場合:
  - AIは別テーマを新規決定しない
  - `1) 今週の方針` の先頭行にユーザー指定テーマを固定で採用（言い換え禁止）
- テーマ指定がない場合:
  - 従来どおり、ログ/目標から方針を提案
- 生成時入力は `ai_recommendations.generation_context.explicit_theme` に保存

### 2.7 Web/コミュニティ比重調整（現行）

- Web参照は毎回実行（常時ON）
- コミュニティON時のみ、次でWeb強度を調整
  - 判定軸: `目標タグ × 同一メニュー(canonical_key)` 件数
  - `top_menu_count < 5` → Web強度 `high`
  - `top_menu_count >= 5` → Web強度 `light`
- おすすめ本文の `3) 今週のおすすめメニュー` は各項目3行
  - `メニュー名｜時間`
  - `狙い`
  - `根拠: Web / コミュニティ / 両方`（Webソース取得時はサイト名併記）

## 3. AIおすすめへの追質問会話

- 推奨導線: `/log` から質問 → `/chat` のおすすめ起点スレッドへ遷移
- 再訪時: 同週のおすすめスレッドを再利用
- スレッド種別: `source_kind=ai_recommendation`, `source_date` 保持
- 保持データ
  - 生成時コンテキスト
  - 元おすすめ本文
  - 会話ログ
  - モデル/プロンプトバージョン
- 制約
  - 1スレッド最大20メッセージ
  - 会話履歴投入は直近6往復
  - `POST /api/ai_recommendations/:id/thread/messages` は「今週のおすすめ」のみ許可

### 3.1 無料プランの質問制限（AIチャット側）

- 対象: `source_kind=ai_recommendation` のスレッド
- 制限: **1つの今週おすすめスレッドにつきユーザー質問1回まで**
- 旧仕様（1日1回）から変更済み

### 3.2 日付区切り表示（/chat）

- AIおすすめスレッドでは、`ai_chat_messages.created_at` の日付境界ごとに区切り線を表示
- 例: `3/5(木)` ラベル + 横線
- 目的: 「どの日に質問したか」を1スレッド内で視覚的に把握

## 4. 汎用AIチャット（/chat）

### 4.1 役割

- おすすめ調整専用ではなく、ボイトレ全般の自発的相談
- ただし、Koelogsデータを参照して個別最適化を優先

### 4.2 応答系サービス

- 汎用会話: `Ai::GeneralChatResponder`
- おすすめ追質問: `Ai::RecommendationFollowupResponder`

### 4.3 コンテキスト優先

1. 最新質問（最優先）
2. Koelogs内データ（長期プロフィール/ログ/おすすめ履歴）
3. 外部知識（必要時のみ）

### 4.4 チャット由来メモリ保存（保存候補）

- 保存候補の抽出: `Ai::ChatMemoryCandidateExtractor`
  - 現在は「全メッセージでAI判定」を実施
  - 判定出力: `save true/false`, `candidate_text`, `destination`
  - LLM失敗時のみ軽量ルールへフォールバック
- 保存候補テーブル: `ai_profile_memory_candidates`
  - `pending / saved / dismissed`
  - 期限: 7日（期限切れは削除）
- UI（/chat）:
  - 候補が生成されたメッセージでのみ保存UIを表示
  - 表示項目: 保存内容 / 保存先
  - 操作: `保存` / `訂正` / `スキップ`
  - `訂正` はチャット欄内で保存内容と保存先（強み/課題/成長過程/避けたい練習/注意点）を編集可能
- 保存先ポリシー（2026-03-05時点）:
  - 新規保存は `voice` のみ許可（`profile` への新規保存は無効化）
  - 既存 `profile` データは保持（非表示運用）

## 5. 長期プロフィール（AIが参照する長期プロフィール）

### 5.1 設定場所

- ` /settings/ai `

### 5.1.1 /settings/ai の編集項目（現行）

- AIが参照する長期プロフィール
  - 声に関して: `強み / 課題 / 成長過程 / 避けたい練習/注意点`
- 回答スタイル
  - カスタム指示（自由記述）
  - 構造化スタイル（`style_tone / warmth / energy / emoji`）
  - 優先順位: カスタム指示が最優先、未指定部分を構造化設定で補完
- 改善したい項目
- AIおすすめの参照期間（14 / 30 / 90）

### 5.2 データ構造

- `ai_user_profiles`
  - `auto_profile`（自動要約）
  - `user_overrides`（ユーザー編集）
  - `source_window_days=90`
  - `source_fingerprint` / `source_meta`

### 5.3 更新

- 変更時: `AiUserProfileRefreshJob`
- 日次: `AiUserProfilesDailyRefreshJob`
- 反映先
  - AIおすすめ
  - 汎用AIチャット
  - おすすめ追質問チャット（補助）

## 6. 外部知識（Web検索）連携

- 検索発火判定: `Ai::WebSearchDecision`
- 実行: `Gemini::Client` の `web_search` オプション
- 参照URL取得時は回答末尾に `参考情報:` を付与
- ねらい
  - Koelogsの個別最適は維持
  - アプリ内にない一般知識は必要時のみ補完

## 7. 用語辞書（内部定義）

- 定義ファイル: `config/ai_terms.yml`
- 役割
  - Web検索で弱い/不正確になりやすい用語の誤答抑制
  - 例: `mum+buzz` など
- 利用方針（現行）
  - 単語説明要求で情報が弱いとき、内部辞書を優先参照

## 8. 主要API

- AIおすすめ
  - `GET /api/ai_recommendations?date=YYYY-MM-DD&range_days=14|30|90`
  - `POST /api/ai_recommendations`（`date`, `range_days`, `today_theme?`）
- おすすめ会話
  - `GET /api/ai_recommendations/:id/thread`
  - `POST /api/ai_recommendations/:id/thread/messages`
- AIチャット
  - `GET /api/ai_chat/threads`
  - `POST /api/ai_chat/threads`
  - `GET /api/ai_chat/threads/:id`
  - `PATCH /api/ai_chat/threads/:id`
  - `DELETE /api/ai_chat/threads/:id`
  - `POST /api/ai_chat/threads/:id/messages`

## 9. 主要テーブル（AI関連）

- `users`
  - `goal_text`
  - `ai_custom_instructions`
  - `ai_improvement_tags`
  - `ai_response_style_prefs`
- `ai_recommendations`
  - `generated_for_date`
  - `week_start_date`
  - `range_days`
  - `recommendation_text`
  - `collective_summary`
  - `generation_context`
  - `generator_model_name`
  - `generator_prompt_version`
- `ai_recommendation_threads`
- `ai_recommendation_messages`
- `ai_chat_threads`
- `ai_chat_messages`
- `ai_profile_memory_candidates`
- `ai_user_profiles`
- `ai_token_usages`（全AI共通の利用量管理）

## 10. 運用メモ

- AI出力はプレーンテキスト前提（Markdown禁止）
- 生成失敗時は、可能な限りフェイルオープンで継続（ユーザー操作を止めない）
- UI改善時は、`/log` と `/chat` の動線一貫性を優先

## 11. 関連ドキュメント

- 集合知とAIおすすめ詳細
  - `docs/COLLECTIVE_INTELLIGENCE_AI_RECOMMENDATIONS.md`
- 現行実装仕様
  - `docs/CURRENT_IMPLEMENTATION_SPEC_2026-03-05.md`
- プロジェクト全体概要
  - `README.md`
