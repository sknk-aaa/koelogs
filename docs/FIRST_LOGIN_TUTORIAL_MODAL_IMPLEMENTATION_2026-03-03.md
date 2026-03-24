# 初回ログイン時チュートリアルモーダル 実装まとめ（2026-03-03）

## 1. 目的
- 初回ログイン/新規登録ユーザーに、Koelogsの基本導線（ミッション -> 測定 -> 継続利用）を迷わず体験してもらう。
- チュートリアル表示を共通コンポーネント化し、文言/デザインを一括調整可能にする。

## 2. 対象実装ファイル
- `frontend/src/components/TutorialModal.tsx`
- `frontend/src/features/tutorial/tutorialFlow.ts`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/SignupPage.tsx`
- `frontend/src/pages/LogPage.tsx`
- `frontend/src/pages/MyPage.tsx`
- `frontend/src/pages/TrainingPage.tsx`
- `frontend/src/pages/LogNewPage.tsx`
- `frontend/src/components/AppFooterTabs.tsx`
- `frontend/src/features/missions/beginnerMissionGate.ts`
- `app/controllers/api/missions_controller.rb`
- `app/controllers/api/me_controller.rb`

## 3. 共通モーダル仕様
- コンポーネント: `TutorialModal`
- `createPortal` で `document.body` に描画。
- ボタン構成:
  - Primary: 必須
  - Secondary: 任意（例: 「あとで」）
- オープン中は `body` のスクロールをロック。
- `onClose={() => {}}` を渡すことで、実質的に任意閉じを抑制できる。

## 4. チュートリアルステージ管理
- 保存先: `localStorage`
- キー: `koelogs:tutorial_stage:user_<userId>`
- ステージ定義:
  - `log_welcome`
  - `mypage_intro`
  - `mypage_open_mission_modal`
  - `mypage_force_click_measurement`
  - `training_range_intro`
  - `awaiting_range_measurement`
  - `range_measured`
  - `tutorial_completed`
  - `completed`

## 5. 初回表示トリガー
- ログイン/新規登録後に `/api/missions` 相当を確認し、ビギナーミッション未完了なら `log_welcome` を保存。
- 一度だけの発火制御:
  - キー: `koelogs:first_login_landing_seen_user_<userId>`
  - 既に見たユーザーは再発火しない。

## 6. 画面フロー（現行）
1. `/log`（`log_welcome`）
- モーダル: 「はじめまして、Koelogsへようこそ！」
- CTA: `ビギナーミッションをはじめる`
- 押下時: `mypage_intro` を保存して `/mypage` へ遷移。

2. `/mypage`（`mypage_intro`）
- モーダル: 「ビギナーミッション」
- CTA: `ビギナーミッションを確認する`
- 押下時: `mypage_open_mission_modal` へ進行。

3. `/mypage`（`mypage_open_mission_modal`）
- ミッションカードを暗幕+ハンド画像で強調。
- フッター操作をロック（`data-mypage-tutorial-lock-footer=true`）。
- ミッションカード押下で `training_range_intro` を保存し、`/training?mission=range&tutorial=beginner` へ遷移。

4. `/training`（`training_range_intro`）
- モーダル: 「最初の一歩：音域測定」
- CTA:
  - Primary: `▶ 測定を開始する`
  - Secondary: `あとで`
- Primary押下で `awaiting_range_measurement` を保存し、音域測定を開始。

5. 測定開始中（`awaiting_range_measurement`）
- 補助モーダル: 「まずは地声を測ってみましょう！」
- 内容: 低音から高音まで、無理せず測定するガイド。

6. 測定完了後（`range_measured`）
- モーダル: 「音域測定が完了しました。」
- CTA: `次へ`
- 押下時: `tutorial_completed` へ進行。

7. 完了モーダル（`tutorial_completed`）
- モーダル: 「チュートリアル完了」
- CTA: `▶ Koelogsをはじめる`
- 押下時: `completed` を保存し `/mypage` に遷移。

## 7. ミッション導線との連携
- 表記は全体で「初心者ミッション」から「ビギナーミッション」に統一済み。
- `/mypage` と `/log` どちらでも、ビギナーミッションはカード押下でモーダル一覧を開く。
- ビギナー未完了時:
  - デイリーミッション一覧は `/mypage` モーダルで非表示。
- `beginner_measurement` は、チュートリアルの測定完了ステージでも達成扱いに補正。
- 日ログミッション (`beginner_daily_log`) 導線:
  - `/log` で「今日のトレーニングを記録」ボタンを強調（ポインター表示は現在なし）。
  - `/log/new` 表示時に説明モーダルを出す。

## 8. AIチャット解放連携
- フッターは常に5タブ固定（ログ / AIチャット / トレーニング / コミュニティ / 分析）。
- ビギナー未完了時のAIチャットタブ:
  - 見た目はロック状態（半透明 + 🔒バッジ）。
  - タップは受けるが遷移せず、解放条件モーダルを表示。
- 解放判定データ:
  - `/api/me` の `beginner_missions_completed`
  - `fetchBeginnerMissionGate()` の結果
  - 補助キャッシュ: `koelogs:beginner_last_pending:user_<userId>`

## 9. 全ミッション完了モーダル
- 表示タイミング:
  - `pendingCount` が `>0 -> 0` に遷移したときのみ。
- 一度表示済み制御:
  - `koelogs:beginner_complete_modal_seen:user_<userId>`
- 表示場所:
  - `/mypage`
  - `/log`
- モーダル2段:
  1. 「おめでとうございます！」
  2. 「AIチャット機能が解放されました」
     - `さっそく使ってみる` -> `/chat`
     - `あとで` -> 閉じる

## 10. 指差し（強制クリック）実装
- 使用アセット:
  - `frontend/src/assets/tutorial/pointer.png`
- 方針:
  - 画面全体に暗幕を被せる。
  - 目標要素のみ強調し、他操作を実質不可にする。
  - フッターも `pointer-events: none` で無効化。

## 11. 関連補足
- `beginner_ai_customization` の達成判定は `missions_controller.rb` 側で長期プロフィールの上書き入力も考慮。
- ただし `/api/me` の `beginner_missions_completed` は別ロジックで算出されるため、完全一致させる場合は統合検討余地あり。
