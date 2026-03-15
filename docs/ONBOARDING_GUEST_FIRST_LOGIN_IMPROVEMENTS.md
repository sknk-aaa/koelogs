# 未ログイン・初ログイン向け改善まとめ（2026-02）

## 目的
- 初回訪問ユーザーが「このアプリで何ができるか」をすぐ理解できるようにする
- 未ログイン状態での迷いを減らし、ログイン・初回記録までの導線を明確にする
- 初回ログイン後の最初の記録を短時間で完了できるようにする

## 対象範囲
- Logページ（`/log`）
- Trainingページ（`/training`）
- Log新規入力ページ（`/log/new`）

## 実施内容

### 1. 未ログイン時（/log）
- 体験ヘッダーを追加
  - `声の状態を記録すると、今日の練習がすぐ決まる`
  - `まずはサンプルで使い方を30秒で確認できます`
- 1タップ導線を追加
  - `サンプルを見る`（同ページ内スクロール）
  - `ログインして始める`（ログイン画面へ遷移）
- 成果先出しの3カードを追加
  - `最高音の変化が見える`
  - `継続状況が一目で分かる`
  - `次にやることが決まる`
- 再CTAを追加
  - `ここまでの流れをあなたのデータで始める`
  - `ログインして始める`
- サンプル明示を追加
  - サマリーカードに `サンプル` バッジ
  - AIおすすめカードに `サンプル` バッジ
  - AIボタン下に注記
    - `ログイン後は、あなたの目標と記録を使って提案します。`

### 2. 未ログイン時（/training）
- ゲスト向け表示を `AI録音分析` 紹介カードに置き換え
  - `録音した音声から、ピッチ安定度や音程精度などを分析`
  - `結果をもとに、次に改善するポイントを具体的に確認できる`
  - 例示文を表示
    - `例: ピッチ安定度 78 / 改善ポイント: 語尾で音程が下がる傾向`
  - CTA
    - `ログインしてAI録音分析を使う`

### 3. 初回ログイン時（/log）
- 歓迎モーダルを追加（情報量を絞った1アクション）
  - `voice-appへようこそ！`
  - `まずは現在の最高音や声の状態を記録してみましょう。`
  - `記録をもとに、AIが今日のおすすめトレーニングを提案します。`
  - ボタン
    - `あとで見る`
    - `記録する`

### 4. モーダルからの記録導線（/log/new）
- モーダルの `記録する` 遷移時のみ、簡易記録モードを有効化
- 簡易記録モードの表示項目
  - 最高音（裏声 / 地声）
  - `現在の声の状況を教えてください`（メモ）
- 非表示項目
  - 練習時間
  - 練習メニュー

### 5. AIおすすめの参照データ
- AIおすすめ生成は常に「当日を含めた直近N日」を参照
- UI文言も統一
  - `今日を含めて直近 {N} 日を参考`

### 6. Insights（最高音詳細）
- `最高音の推移（詳細）` の期間デフォルトを7日に変更

## 表示条件（現在）

### 初回歓迎モーダル表示条件（/log）
以下をすべて満たすときのみ表示
1. ログイン済み
2. このブラウザで未表示（`localStorage` 未記録）
3. 総記録日数が0件（`total_practice_days_count === 0`）

### 簡易記録モード条件（/log/new）
- URLクエリ `quick=1` ではなく、遷移時の `navigation state` で判定
- 歓迎モーダルの `記録する` からの遷移時のみ有効

## 関連ファイル
- `frontend/src/pages/LogPage.tsx`
- `frontend/src/pages/LogPage.css`
- `frontend/src/features/log/components/SummaryCard.tsx`
- `frontend/src/features/log/components/AiRecommendationCard.tsx`
- `frontend/src/features/log/components/WelcomeGuideModal.tsx`
- `frontend/src/features/log/components/welcomeGuideModal.css`
- `frontend/src/pages/LogNewPage.tsx`
- `frontend/src/pages/TrainingPage.tsx`
- `frontend/src/pages/TrainingPage.css`
- `frontend/src/pages/InsightsNotesPage.tsx`
- `app/controllers/api/ai_recommendations_controller.rb`
- `app/services/ai/recommendation_generator.rb`
- `app/controllers/api/me_controller.rb`
- `frontend/src/api/auth.ts`
