# CURRENT IMPLEMENTATION SPEC（2026-03-05）

最終更新: 2026-03-07

このドキュメントは、Koelogs の「実装済み仕様」の正本です。  
設計案ではなく、**現在の実コード挙動**を記載します。

## 1. ルーティングと認証区分

- 公開（レイアウト外）
  - `/login`
  - `/signup`
- 公開（レイアウト内）
  - `/log`
  - `/training`
  - `/insights`
  - `/insights/time`
  - `/insights/menus`
  - `/insights/notes`
  - `/community`
  - `/community/rankings`
  - `/community/profile/:userId`
  - `/help/guide`
  - `/help/about`
  - `/help/contact`
- 認証必須（レイアウト内）
  - `/log/new`
  - `/settings`
  - `/settings/ai`
  - `/profile`
  - `/mypage`
  - `/chat`

## 1.1 /log の現行UI方針

- `/log` は白ベースのミニマルUIを採用する
- 世界観の核は以下
  - 英語大文字のセクション見出し
  - 小さい outline icon
  - シアン系テーマカラー
  - 白背景 + 余白中心の情報整理
- 禁止:
  - グラデーション
  - 多重カード
  - 不要な影
- 共通文法:
  - セクションカードは `border: none`, `box-shadow: none`, `border-radius: 16px`
  - pill / ボタン / 選択チップは `border-radius: 999px`
  - 主要セクション見出しは英語大文字 + 小アイコン
  - 主値は強く、補助値は `13px` 前後の muted 表示
  - テーマカラーはアイコン / ボタン / 選択状態 / グラフに限定して使う
- `/log` の日次UI構成は以下
  - 日付ヘッダー
  - 横スクロール週カレンダー
  - 今週のAIおすすめ導線
  - `PRACTICE`
  - `MEASURE`
  - `TODAY MENUS`
  - `NOTE`
- カレンダー仕様:
  - 横スクロール
  - 選択しても並び位置は変えない
  - 非選択日は太めグレー枠
  - 選択日はテーマカラー塗り
  - 未選択の「今日」は薄いテーマカラー枠
- 背景アートは `PRACTICE` にのみ使用し、右下にはみ出す薄い装飾とする
- `MEASURE` は4カード固定で、各カードは機能色を持つが共通文法は揃える

## 2. AIおすすめ（/log）の現行仕様

### 2.1 生成単位と保存

- 週定義は `月曜〜日曜`
- `ai_recommendations.week_start_date` を保持（当該週の月曜日）
- DB一意制約（現行）は以下を維持
  - `user_id + generated_for_date + range_days`
- 生成は手動（ユーザー押下）で実行
- 同日同条件は再生成しない（1日1回）

### 2.2 取得ルール

- `GET /api/ai_recommendations?date=...&range_days=...` は
  - 指定日が属する週（`week_start_date`）で絞り
  - その週の最新1件（`generated_for_date desc`）を返す

### 2.3 生成中リロード時の競合

- 1回目生成中にリロード→再実行で競合した場合
  - ユニーク衝突エラーをそのまま返さない
  - 既存レコードを `200 OK` で返す（フォールバック）

### 2.4 入力テーマ固定（today_theme）

- `POST /api/ai_recommendations` は `today_theme` を受理
- テーマ指定ありの場合
  - AIは別テーマを新規決定しない
  - `1) 今週のテーマ` にテーマ文を固定（言い換え禁止）
- テーマ指定なしの場合
  - 既存ロジックで方針を生成
- 指定テーマは `generation_context.explicit_theme` に保存

### 2.5 テーマキーワード連動の根拠探索

- `range_days=14`: 日次ログ14日
- `range_days=30`: 日次ログ14日 + 月ログ1か月
- `range_days=90`: 日次ログ14日 + 月ログ3か月
- `today_theme` に次の語が含まれる場合のみ、コミュニティ参照を有効化
  - `地声 / 裏声 / ミドル / ミックス / 換声点 / 声帯閉鎖 / 声の芯 / 高音 / 音域 / 音程 / 音量 / ロングトーン / 力み / 喉 / 疲れ / ブレス / 息切れ / 息の持続 / 息`
- テーマ語一致なし（またはテーマ未入力）の場合
  - コミュニティ参照は無効（`collective_effects.rows=[]`）
  - Web補完のみでメニュー探索
- テーマ語一致ありの場合
  - コミュニティ参照を有効化
  - 参照タグは「一致したテーマ語に対応するタグ」に限定
  - キャッシュキーはタグ条件を含む（`...:tags=<tag,...>`）
- 測定結果: 条件一致時のみ補助根拠として使用

### 2.6 現状高解像度診断（内部）

- 推薦前に「現在の声の状況」を5スロットで内部診断
  - `発生帯域 / 課題タイプ（失敗症状 or 改善ターゲット） / 成功条件 / 破綻条件 / 今回の狙い`
- 5スロットは内部材料であり、最終表示では見出し固定を強制しない
- 音域判定は近傍一致を許容（例: F#4なら±2半音）
- 成功条件/破綻条件は、テーマと直接関係する観測を優先（テーマ外測定の混入を抑制）

### 2.7 コミュニティ一致判定と件数ルール

- 一致判定はメニュー名一致ではなく「コミュニティ自由記述 × 診断コンテキスト」の一致を主軸にする
- 強一致1件以上は有効候補として採用
- 一致3件超は上位3件に絞る
- 一致3件未満（0件含む）は不足分を補完
  - 補完順: 同タグ次点コミュニティ → 一致0件時のみ個人ログ実績 → Web
- 同一メニュー重複は統合し、1枠内でやり方差分を併記

### 2.8 Web補完実行条件

- Web補完は常時必須ではない
- コミュニティ一致＋個人実績を統合した候補が3件未満のときのみ実行
- 実行時は `top_menu_count` に応じて探索強度を制御
  - `<5`: `high`
  - `>=5`: `light`

### 2.9 おすすめ本文の根拠行

- 生成後の後処理で、各メニューに `根拠:` 行を必ず補正
  - コミュニティ一致あり + Webあり: `根拠: 両方（コミュニティN件 + Web）`
  - コミュニティ一致あり + Webなし: `根拠: コミュニティN件`
  - コミュニティ一致なし + Webあり: `根拠: Web`
  - Webもない場合: `根拠: 個人ログ`
- 強一致引用がある場合は同メニュー内に `コミュニティ原文: 「...」` を付与
- `根拠:` がWeb/両方の場合は `Web出典: URL...` を付与

## 3. おすすめ追質問（/api/ai_recommendations/:id/thread/messages）

- 投稿可能条件
  - 今週のおすすめのみ（`recommendation.week_start_date == 今週月曜`）
- スレッド上限
  - 1スレッド最大20メッセージ
- 無料ユーザー制限
  - 当該おすすめスレッドでユーザー発話は1回まで

## 4. AIチャット（/chat）のおすすめスレッド運用

### 4.1 週キー統一

- `source_kind=ai_recommendation` のスレッドは `source_date` 必須
- `source_date` は月曜開始に正規化して保存

### 4.2 無料制限

- 無料ユーザーはおすすめスレッドで
  - **1つの今週おすすめにつき1回**まで質問可能
- 旧仕様の「1日1回」は廃止

### 4.3 表示仕様

- AIおすすめスレッドでは、メッセージ一覧に日付区切り線を表示
  - 例: `3/5(木)` のラベル
- 旧日次データ（`source_date` が月曜でないおすすめスレッド）は
  - フロント一覧では表示対象外（開発移行時の混在回避）

## 5. API契約（AI関連）

### 5.1 AIおすすめ

- `GET /api/ai_recommendations?date=YYYY-MM-DD&range_days=14|30|90`
  - レスポンス `data` に `week_start_date` を含む
- `POST /api/ai_recommendations`
  - 入力: `date`, `range_days`, `today_theme?`
  - レスポンス `data` に `week_start_date` を含む

### 5.2 AIおすすめ会話

- `GET /api/ai_recommendations/:id/thread`
- `POST /api/ai_recommendations/:id/thread/messages`

### 5.3 AIチャット

- `GET /api/ai_chat/threads`
- `POST /api/ai_chat/threads`
  - `source_kind=ai_recommendation` の場合は `source_date` 必須
- `POST /api/ai_chat/threads/:id/messages`
  - 無料プラン制限あり（上記4.2）

## 6. 主要データ構造（AI周辺）

- `ai_recommendations`
  - `generated_for_date`
  - `week_start_date`
  - `range_days`
  - `recommendation_text`
  - `collective_summary`
  - `generation_context`（`explicit_theme`, `community_enabled`, `community_tag_keys`, `theme_keyword_hits` を含みうる）
- `ai_recommendation_threads`
  - `ai_recommendation_id`（1推薦1スレッド）
  - `generated_for_date`
- `ai_recommendation_messages`
  - `role`, `content`
- `ai_chat_threads`
  - `source_kind`, `source_date`（おすすめ起点スレッド識別）
- `ai_chat_messages`
  - `role`, `content`, `created_at`

## 7. プレミアム境界（AI関連）

- 無料:
  - おすすめ起点チャットのみ
  - 1つの今週おすすめにつき1回質問
- プレミアム:
  - 回数無制限
  - 一般AIチャット新規作成/会話可

## 8. 参照ドキュメント

- AI全体まとめ: `docs/AI_SYSTEM_OVERVIEW_2026-03-01.md`
- Premium実装: `docs/PREMIUM_PLAN_IMPLEMENTATION_2026-03-01.md`
- 集合知詳細: `docs/COLLECTIVE_INTELLIGENCE_AI_RECOMMENDATIONS.md`
