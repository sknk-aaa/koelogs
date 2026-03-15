# プレミアムプラン実装まとめ（2026-03-02）

本ドキュメントは、現時点での「有料プラン（Premium）」実装状況を整理したものです。  
対象リポジトリ: `voice-app`

## 1. 目的

- 無料/有料の機能境界を明確化する
- UIロックとAPIガードの現状を明文化する
- 未実装項目（本番課金導線・運用）を切り出す

## 2. データモデル

### 2.1 users テーブル追加カラム

- `plan_tier: string`（`null: false`, default: `"free"`）
- `billing_cycle: string`（nullable）
- index: `plan_tier`

### 2.2 モデル側ルール

`app/models/user.rb`

- `PLAN_TIERS = %w[free premium]`
- `BILLING_CYCLES = %w[monthly yearly]`
- validation:
  - `plan_tier` は `free/premium` のみ
  - `billing_cycle` は `monthly/yearly` のみ（nil可）
- helper:
  - `premium_plan?`
  - `free_plan?`

## 3. 認証ユーザー情報API

`GET /api/me` のレスポンスに以下を追加:

- `plan_tier`
- `billing_cycle`

実装: `app/controllers/api/me_controller.rb`

## 4. プレミアムUI共通コンポーネント

### 4.1 誘導モーダル

- `frontend/src/components/PremiumUpsellModal.tsx`
- `frontend/src/components/PremiumUpsellModal.css`

用途:
- 課金対象機能に触れた際にモーダルで案内

### 4.1.1 現在の「共通ベース」仕様（引き継ぎ用）

`PremiumUpsellModal` は、月ログ比較で作ったLPモーダルの見た目をベースとして、他の課金モーダルにも再利用できる形に統一済み。

- 共通レイアウト:
  - `variant="lp"` で LP ベースデザインを適用
  - 構成: `kicker` / `title` / `description` / （任意）`growth` / （任意）`flow` / `note` / CTA
- 主要props:
  - `flowTitle?: string`
  - `flowSteps?: Array<{ title: string; sub: string; pill?: string }>`
  - `growthTitle?: string`
  - `growthItems?: Array<{ label; before; after; delta; tone }>`
  - `ctaLabel`, `onCta`, `onClose`（既存ロジックは維持）
- 挙動:
  - オーバーレイクリックで閉じる
  - モーダル表示中は `body.premiumModal--open` を付与
  - ヘッダー/モードタブは `premiumModal--open` で非表示

備考:
- 旧 `featuresTitle` / `features` は廃止し、`flowTitle` / `flowSteps` に一本化。
- 次回の会話では「`PremiumUpsellModal` の LP ベースを使う」が前提。

### 4.2 モザイクロック表示

- `frontend/src/components/PremiumLockOverlay.tsx`
- `frontend/src/components/PremiumLockOverlay.css`

用途:
- 「プレミアムプランで解放されます」を視覚的に表示
- UI上は見せるが操作はロックするエリアで利用

## 4.3 プレミアム案内ページ（導線統一）

- `frontend/src/pages/PremiumPlanPage.tsx`
- `frontend/src/pages/PremiumPlanPage.css`
- ルート: `/premium`

用途:
- ロックモーダルからの遷移先を統一
- Premiumで解放される機能を一覧で提示

## 5. 機能別の実装状況

## 5.1 月ログ比較（/log, month）

実装状況: **実装済み（UIロック）**

- 比較導線をタップ時、`plan_tier !== "premium"` は比較モーダルを開かず、プレミアム誘導モーダルを表示
- 有料ユーザーのみ比較モーダルを開く

関連ファイル:
- `frontend/src/pages/LogPage.tsx`
- `frontend/src/components/PremiumUpsellModal.tsx`
- `frontend/src/components/PremiumUpsellModal.css`

## 5.2 分析トップCSV出力（/insights）

実装状況: **実装済み（UIロック）**

- CSVボタン押下時:
  - 無料: プレミアム誘導モーダル
  - 有料: CSVダイアログを開く

関連ファイル:
- `frontend/src/pages/InsightsPage.tsx`

## 5.3 分析詳細（/insights/notes）

実装状況: **実装済み（無料制限UI）**

無料ユーザー制限:
- グラフ: 直近7日ミニグラフ表示
- 測定履歴: 直近3件表示
- 追加領域: モザイクロックUI表示（タップでプレミアム誘導モーダル）

有料ユーザー:
- 制限なし表示

関連ファイル:
- `frontend/src/pages/InsightsNotesPage.tsx`
- `frontend/src/pages/InsightsPages.css`

## 5.4 録音測定強化（/training 結果モーダル）

実装状況: **実装済み（UIロック）**

ロック対象:
- 録音再生プレビュー
- 音声のみWAV保存

無料ユーザー:
- モザイクロックUI表示 + プレミアム誘導モーダル

有料ユーザー:
- 従来どおり使用可

関連ファイル:
- `frontend/src/pages/TrainingPage.tsx`
- `frontend/src/pages/TrainingPage.css`

## 5.5 AIチャット（/chat）

実装状況: **実装済み（APIガード + モーダル誘導）**

### バックエンド制限

`app/controllers/api/ai_chat_controller.rb`

- `POST /api/ai_chat/threads`
  - 無料かつ `source_kind != ai_recommendation` の新規チャット作成を拒否
- `POST /api/ai_chat/threads/:id/messages`
  - 無料かつ一般チャット(`source_kind != ai_recommendation`)は拒否
  - 無料かつおすすめスレッドでも「1つの今週おすすめにつき1回」超過で拒否
- 拒否時は `402 Payment Required` + `code: "premium_required"` を返却

### おすすめスレッドの定義（2026-03-06時点）

- おすすめスレッドは「今週おすすめ（週キー: 月曜開始 `week_start_date`）」基準で運用
- 無料制限の単位も「1日」ではなく「1つの今週おすすめスレッド」単位
- 同一週内では、日付が変わっても同一おすすめスレッドとして扱う

### フロント挙動

`frontend/src/pages/AiChatPage.tsx`

- 「新しいチャット」作成時、無料ユーザーはプレミアム誘導モーダル
- 送信時にAPIから `402` を受けた場合もモーダル表示
- AI領域は `Pro` バッジ表示なし（モーダル誘導のみ）

## 5.6 課金モーダルのベース再利用（2026-03-02反映）

実装状況: **実装済み（UI統一）**

- 月ログ比較モーダルのLPデザインを「共通ベース」として再利用
- 以下すべてが `variant="lp"` + `flowTitle/flowSteps` で統一:
  - `/log`（月ログ比較）
  - `/chat`（AIチャット）
  - `/insights`（CSV）
  - `/insights/notes`（分析詳細）
  - `/training`（録音測定強化）

狙い:
- ページ間で課金モーダルの体験を統一
- 次の改修で「1コンポーネントの調整 = 全課金モーダルに反映」を可能化

## 6. 無料/有料の現状整理（実装ベース）

無料でできる:
- AIおすすめ由来スレッドへの質問（1つの今週おすすめにつき1回まで）
- 月ログ画面の通常利用
- 分析ページの基本閲覧

無料で制限される:
- AI一般チャット新規作成・無制限会話
- 月ログ比較の詳細閲覧
- Insights CSV出力
- Insights詳細の全期間グラフ/全履歴
- 録音再生プレビュー/WAV保存

有料で解放:
- 上記制限機能すべて

### 6.1 AIおすすめ本体の仕様変更と課金境界（2026-03-06反映）

以下はおすすめ内容生成ロジックの変更であり、課金境界自体は変わらない。

- テーマ語一致時のみコミュニティ参照、非一致時はWebのみ
  - 一致語: `音域 / 音程 / 換声点 / 息切れ / 音量 / 力み / 声の抜け / ロングトーン`
- Web参照は常時ON（無料/有料で同一）
- 判定軸は `目標タグ × 同一メニュー(canonical_key)` 件数
  - `top_menu_count < 5` でWeb強度 `high`
  - `top_menu_count >= 5` で `light`
- これらは「おすすめ品質ロジック」であり、無料/有料の可否条件は変更しない

## 7. 未実装/今後のタスク

## 7.1 決済フロー本体

現状:
- 誘導モーダルのCTAは `/premium` へ遷移し、そこから設定ページへ進む構成

未実装:
- 決済開始
- 決済成功/失敗ハンドリング
- サブスク状態同期
- 解約/復元

## 7.2 サーバー側ガードの統一

現状:
- AIチャットはサーバー側で制限済み
- 一部機能はフロント制御中心

今後:
- 重要機能はAPI側でも必ず `plan_tier` を検査し、直叩きで回避できないように統一

## 7.3 運用導線

未実装:
- 管理者による `plan_tier` 変更運用
- 請求状態と `billing_cycle` の確定ロジック

## 8. 変更ファイル一覧（有料プラン関連）

Backend:
- `db/migrate/20260301180000_add_plan_fields_to_users.rb`
- `app/models/user.rb`
- `app/controllers/api/me_controller.rb`
- `app/controllers/api/ai_chat_controller.rb`
- `db/schema.rb`

Frontend:
- `frontend/src/api/auth.ts`
- `frontend/src/components/PremiumUpsellModal.tsx`
- `frontend/src/components/PremiumUpsellModal.css`
- `frontend/src/assets/premium/flow-graph.svg`
- `frontend/src/components/PremiumLockOverlay.tsx`
- `frontend/src/components/PremiumLockOverlay.css`
- `frontend/src/pages/LogPage.tsx`
- `frontend/src/pages/InsightsPage.tsx`
- `frontend/src/pages/InsightsNotesPage.tsx`
- `frontend/src/pages/InsightsPages.css`
- `frontend/src/pages/TrainingPage.tsx`
- `frontend/src/pages/TrainingPage.css`
- `frontend/src/pages/AiChatPage.tsx`
- `frontend/src/pages/PremiumPlanPage.tsx`
- `frontend/src/pages/PremiumPlanPage.css`
- `frontend/src/App.tsx`

## 9. 次回引き継ぎメモ（課金モーダル）

次回会話で課金モーダルを調整する場合は、以下を前提にすること。

1. 入口は `PremiumUpsellModal` のみを編集する
2. 各ページ側は `flowTitle` / `flowSteps` / `note` / `ctaLabel` の文言差し替えで対応する
3. 課金ロジック（`plan_tier` 判定、`402`、遷移処理）は触らない
4. LPベースのデザイン変更は、まず `/log` を確認してから全ページへ波及確認する

## 10. 2026-03-03 追記（UI微調整ログ）

本日は課金ロジックの変更は行わず、Premium導線のUI調整のみ実施。

- `/premium` を「専用ページ」前提で調整
  - 共通ヘッダー/フッターを非表示
  - 専用ヘッダー（戻るボタン + タイトル）を追加
- 料金エリアの表示調整
  - 画面下固定化
  - 本文との隙間/背景の見え方を調整
  - 価格カードサイズと見出しサイズをモバイル向けに再調整
- セクション構成・文言の軽量化
  - 冗長な要約カードを削除
  - ヒーロー文言を短文化
- 比較表の視認性調整
  - モバイルでのはみ出し修正
  - 左上/左下角丸など細部調整
  - 行追加: `今後追加される新機能`
- ベネフィット行のアイコンを全面再設計
  - 6アイコンを 24px統一SVGで整理（`currentColor`, `fill:none`, round cap/join）
  - 線幅を細めに統一（CSS側で調整）
  - 指定パーツのみ青アクセント、その他はグレー
  - アイコンサイズは従来比約1.2倍で調整

補足:
- 本日時点の `/premium` は「UI検討・改善段階」。
- 実課金処理（決済プロバイダ連携、`billing_cycle` 確定ロジック）は未着手。

---

最終更新日: 2026-03-06
