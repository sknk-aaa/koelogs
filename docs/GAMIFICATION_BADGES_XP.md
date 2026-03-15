# バッジ / XP 仕様まとめ（現行実装）

更新日: 2026-02-25  
対象: `voice-app` 現行コードベース

この文書は、以下の実装を要約したものです。
- `app/services/gamification/badge_catalog.rb`
- `app/services/gamification/progress.rb`
- `app/services/gamification/awarder.rb`
- 各APIコントローラのXP付与呼び出し

---

## 1. バッジの種類

現行バッジは以下の24種類です。

### 1.1 継続ログ系
- `first_log` : First Log（はじめて日ログを保存）
- `streak_3` : 3-Day Streak（最長連続日数 3日）
- `streak_7` : 7-Day Streak（最長連続日数 7日）
- `streak_30` : 30-Day Streak（最長連続日数 30日）

### 1.2 XP到達系
- `xp_500` : XP 500（累計XP 500）
- `xp_1000` : XP 1000（累計XP 1000）
- `xp_2000` : XP 2000（累計XP 2000）

### 1.3 測定系
- `measurement_master` : Measurement Completer（4種類すべての測定を達成）

判定指標:
- `measurement_types_completed_count`（`range / long_tone / volume_stability / pitch_accuracy` のdistinct数）

### 1.4 AI活用系
- `ai_user_5` : First AI（AI提案生成 5回）
- `ai_user_30` : AI User（AI提案生成 30回）
- `ai_user_50` : AI Partner（AI提案生成 50回）
- `ai_user_100` : AI Master（AI提案生成 100回）

判定指標:
- `ai_recommendations_count`

### 1.5 コミュニティ投稿系
- `community_post_1` : First Voice（公開投稿 1回）
- `community_post_5` : Active Contributor（公開投稿 5回）
- `community_post_20` : Community Master（公開投稿 20回）

判定指標:
- `community_published_posts_count`（`published = true` のみ）

### 1.6 月メモ連続系
- `monthly_memo_streak_1` : First Month Log（最長連続 1か月）
- `monthly_memo_streak_3` : 3-Month Streak（最長連続 3か月）
- `monthly_memo_streak_6` : 6-Month Streak（最長連続 6か月）
- `monthly_memo_streak_12` : 12-Month Streak（最長連続 12か月）

判定指標:
- `longest_monthly_log_streak_months`

### 1.7 AI貢献系
- `ai_contribution_1` : First AI Contribution（1回採用）
- `ai_contribution_5` : AI Supporter（5回採用）
- `ai_contribution_20` : AI Contributor（20回採用）
- `ai_contribution_50` : AI Contributor+（50回採用）
- `ai_contribution_100` : AI Influencer（100回採用）

判定指標:
- `ai_contribution_count`（`ai_contribution_events` の `ai_recommendation_id` distinct）

---

## 2. XPの獲得方法

現行のXPルールは以下です（`XP_RULE_POINTS`）。

- `training_log_saved` : +10 XP
- `training_log_feedback_added` : +5 XP
- `monthly_log_saved` : +20 XP
- `measurement_saved` : +10 XP
- `ai_recommendation_generated` : +15 XP
- `community_post_published` : +20 XP

### 2.1 どの操作で付与されるか
- 日ログ保存（新規作成時）
  - `training_log_saved`
- 日ログ効果メモ初回追加
  - `training_log_feedback_added`
- 月振り返りメモ保存（新規作成時）
  - `monthly_log_saved`
- 測定保存
  - `measurement_saved`
- AIおすすめ生成保存
  - `ai_recommendation_generated`
- コミュニティ投稿保存（`published=true` のときのみ）
  - `community_post_published`

### 2.2 重複付与防止
`xp_events` は以下の組で一意制約を持ちます。
- `user_id + rule_key + source_type + source_id`

そのため同じソースに対する同一ルールは二重加算されません。

---

## 3. レベル計算

- 累計XP: `xp_events.points` の合計
- レベル式: `level = floor(sqrt(total_xp / 25)) + 1`
- 次レベル必要XPは `Progress.total_xp_for_level` で算出

---

## 4. APIレスポンス上の見え方

- `Gamification::Progress.summary_for` で以下を返す:
  - `total_xp`, `level`, `xp_to_next_level`
  - `streak_current_days`, `streak_longest_days`
  - `badges[]`（`key`, `name`, `description`, `icon_path`, `unlocked`, 進捗など）

- 保存系APIは必要時 `rewards` を返す:
  - `xp_earned`
  - `unlocked_badges`

### 4.1 `unlocked_badges` の仕様（2026-02-25更新）
- `unlocked_badges` は「今回の処理で実際に解放されたバッジのみ」を返す。
- 以前から条件を満たしていた未登録バッジを、無関係な操作で同時返却しない。
- バッジ解放対象は行動（`rule_key`）ごとに限定される。
  - 例:
    - `measurement_saved` では `measurement_master` と `xp_*` 系のみ解放対象
    - `community_post_published` でのみ `community_post_*` 系を解放対象
    - `ai_recommendation_generated` では `ai_user_*` と `xp_*` 系を解放対象

---

## 5. ミッションUIとの関係

- ミッション達成とバッジ解放は別仕様。
- ミッション達成そのものを理由に `unlocked_badges` を返すことはない。
- フロントのバッジ獲得ポップアップは `rewards.unlocked_badges` を表示しているため、実質的に「バッジ解放時のみ表示」になる。

---

## 6. 補足

- 表示上のバッジ獲得判定は、進捗値が閾値以上でも `unlocked=true` になり得ます。
- 画像パスは原則 `/badges/<badge_key>.svg`。
