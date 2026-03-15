# 測定機能集約 + 月ログ化 仕様書（voice-app）

最終更新: 2026-02-21

## 1. 目的

- `/log/new`（日ログ入力）から最高音入力を削除し、日ログは「練習メモ記録」に責務を限定する。
- `/training` に測定機能を集約し、同一導線で定点測定できるようにする。
- `/insights` は「成長推移の可視化」に特化し、メニュー実施数は月ログ側へ移す。
- 週ログを廃止し、月ログへ置き換える。
- AI録音分析の「ユーザー自由設定メニュー作成」を廃止し、固定プリセット運用にする。

---

## 2. スコープ

### 2.1 含む

- DB: `monthly_logs` 追加、`weekly_logs` 廃止、測定セッション項目の明確化
- API: 月ログAPI追加、週ログAPI廃止、測定/分析APIの固定プリセット化
- UI: `LogNewPage` 最高音入力削除、`TrainingPage` 測定UI強化、`Insights` 改修

### 2.2 含まない

- ルーティングのコアURL変更（`/log`, `/log/new`, `/training`, `/insights` は維持）
- AIおすすめ生成の主仕様変更（参照ロジックは現行維持）

---

## 3. 用語定義

- 測定: `TrainingPage` で実施する音声計測（最高音・音域・ロングトーン・音程正確性・音量安定性）
- 固定条件測定: スケール/テンポが固定の音源条件で測る測定
- 月ログ: `YYYY-MM` 単位の振り返り（一覧 + 集計 + 月メモ）

---

## 4. DB仕様

## 4.1 `training_logs`（既存）

- 維持カラム:
  - `practiced_on`, `duration_min`, `notes`
- 段階的廃止対象:
  - `falsetto_top_note`, `chest_top_note`

方針:
- Phase 1では列は残す（後方互換）。
- 新UI/APIからは更新しない（`null`固定）。
- Phase 3で列削除マイグレーションを実施。

## 4.2 `analysis_menus`（既存）

方針:
- ユーザー作成用途を停止し、「システム固定プリセット」の保持先として利用。
- `archived` は管理用として維持。
- `name` は固定値のみ（例: `falsetto_peak`, `chest_peak`, `range_check`, `long_tone`, `pitch_accuracy_fixed`, `volume_stability_fixed`）。

追加推奨:
- `system_key:string`（unique, null: false）を追加し、画面表示名変更と内部識別子を分離。

## 4.3 `analysis_sessions`（既存）

目的:
- 測定結果の時系列データをこのテーブルに集約する。

追加カラム:
- `measurement_kind:string`（null: false）
  - 値: `falsetto_peak | chest_peak | range | long_tone | pitch_accuracy | volume_stability`
- `lowest_note:string`（音域測定用）
- `range_semitones:integer`（既存カラムの意味を明確化して利用）

既存カラム利用:
- `peak_note`（最高音）
- `duration_sec`（ロングトーン秒数にも利用）
- `raw_metrics`（詳細値）
  - `pitch_accuracy_cents_mean`
  - `pitch_accuracy_cents_stddev`
  - `volume_stability_db_stddev`
  - `waveform_rms_series`
  - `pitch_hz_series` など

## 4.4 `monthly_logs`（新規）

テーブル:
- `user_id` (FK, not null)
- `month_start:date` (not null)  ※ 常に月初日
- `notes:text`（月の振り返りメモ）
- timestamps

制約:
- unique index: `(user_id, month_start)`

備考:
- 「今月の日ログ一覧」「合計実施メニュー」「累計練習時間」は `training_logs` / `training_log_menus` から都度集計。

## 4.5 `weekly_logs`（既存）

方針:
- Phase 2で参照停止。
- Phase 3でテーブル/関連コード削除。

---

## 5. API仕様

## 5.1 日ログAPI（変更）

対象: `POST /api/training_logs`

変更:
- リクエストから以下を削除（受けても無視）:
  - `falsetto_enabled`, `falsetto_top_note`, `chest_enabled`, `chest_top_note`
- レスポンスから以下を段階削除:
  - `falsetto_top_note`, `chest_top_note`

最終ペイロード:
- 入力: `practiced_on`, `duration_min`, `menu_ids`, `notes`, `effect_feedbacks`
- 出力: 上記に対応する日ログ情報のみ

## 5.2 測定セッションAPI（変更）

対象: `POST /api/analysis_sessions`, `GET /api/analysis_sessions`

作成必須項目:
- `analysis_menu_id`（固定プリセット）
- `measurement_kind`
- `duration_sec`
- `raw_metrics`（測定種別ごとの詳細）

種別別必須:
- `falsetto_peak` / `chest_peak`: `peak_note`
- `range`: `peak_note`, `lowest_note`, `range_semitones`
- `long_tone`: `duration_sec`
- `pitch_accuracy`: `raw_metrics.pitch_accuracy_cents_mean`
- `volume_stability`: `raw_metrics.volume_stability_db_stddev`

備考:
- AI評価文は現行どおり生成可能だが、UIでは「測定理由表示」中心で利用。

## 5.3 分析メニューAPI（変更）

対象: `/api/analysis_menus`

方針:
- `GET` は維持（固定プリセット返却）。
- `POST` / `PATCH` は無効化。
  - 推奨: 403 で `"analysis menu customization has been removed"` を返す。

## 5.4 月ログAPI（新規）

### GET `/api/monthly_logs?month=YYYY-MM`

レスポンス:
```json
{
  "data": {
    "month": "2026-02",
    "month_start": "2026-02-01",
    "month_end": "2026-02-28",
    "notes": "月の振り返り",
    "summary": {
      "total_duration_min": 420,
      "total_menu_count": 37
    },
    "daily_logs": [
      {
        "id": 10,
        "practiced_on": "2026-02-14",
        "duration_min": 30,
        "menus": [{ "id": 1, "name": "リップロール", "color": "#E0F2FE" }],
        "notes": "メモ"
      }
    ]
  }
}
```

### POST `/api/monthly_logs`

入力:
```json
{
  "month": "2026-02",
  "notes": "月の振り返りメモ"
}
```

挙動:
- upsert（`month_start` 単位）
- `notes` のみ更新

## 5.5 週ログAPI（廃止）

- 削除: `GET /api/weekly_logs`, `POST /api/weekly_logs`

---

## 6. Insights API仕様（変更）

対象: `GET /api/insights`

方針:
- 「成長可視化」に集中したレスポンスへ再編。
- `menu_ranking` を削除（または deprecated 扱いで空配列）。

追加指標（例）:
- `measurement_series.falsetto_peak[]`
- `measurement_series.chest_peak[]`
- `measurement_series.range_semitones[]`
- `measurement_series.long_tone_sec[]`
- `measurement_series.pitch_accuracy_cents_mean[]`
- `measurement_series.volume_stability_db_stddev[]`

注記:
- 音程正確性・音量安定性は「小さいほど良い」軸（偏差系）で統一表示。

---

## 7. UI仕様

## 7.1 `/log/new`（LogNewPage）

変更:
- 削除:
  - 裏声/地声最高音入力
  - 録音して自動入力UI（チューナー/波形関連）
- 維持:
  - 日付
  - 練習時間
  - 実施メニュー
  - 日メモ

## 7.2 `/training`（TrainingPage）

追加:
- 「測定スタジオ」セクション（タブまたはカード）
  - 裏声最高音
  - 地声最高音
  - 音域（最低音〜最高音）
  - ロングトーン秒数
  - 音程正確性（固定音源）
  - 音量安定性（固定音源）

要件:
- 音程正確性/音量安定性は固定スケール + 固定テンポのみ選択可。
- 測定中UI:
  - 波形（時系列）
  - ピッチトレース
  - 現在値/ベスト値
- 測定終了後:
  - 結果保存
  - 当日比較/前回比較

削除:
- 分析メニュー自由作成/編集UI

## 7.3 `/insights`（InsightsPage）

変更:
- ダッシュボードカードを「測定成長」中心に再構成。
- `メニュー頻度` カード削除。
- 期間切替（30/90/365）は維持。

詳細ページ:
- `/insights/time` は維持（練習時間推移）
- `/insights/notes` は「声の成長（最高音・音域・ロングトーン等）」へ拡張
- `/insights/menus` は導線廃止
  - 互換のため、直接アクセス時は「月ログへ移動」を表示して `/log?mode=month&month=YYYY-MM` を案内

## 7.4 `/log`（LogPage）

変更:
- `mode=week` 廃止
- `mode=month` 追加
  - `?mode=month&month=YYYY-MM`

月ログ表示内容:
- 今月の日ログ一覧（`training_logs?month=` 利用）
- 合計実施メニュー（1ヶ月集計）
- 累計練習時間
- 月の振り返りメモ（保存可）

---

## 8. 型定義変更（frontend）

- `src/types/trainingLog.ts`
  - `falsetto_top_note`, `chest_top_note` を deprecated 化後に削除
- 新規 `src/types/monthlyLog.ts`
  - `MonthlyLogSummary`, `MonthlyLogResponse`
- `src/types/insights.ts`
  - `menu_ranking` を deprecated 化
  - `measurement_series` を追加
- `src/types/analysisMenu.ts`
  - `system_key` 追加

---

## 9. 移行計画（段階）

## Phase 1（後方互換あり）

- UI先行:
  - `LogNewPage` の最高音入力削除
  - `TrainingPage` に測定UI移設
- API互換:
  - `training_logs#create` は旧項目を受けても保存しない
  - `analysis_menus#post/patch` を403化
- DB:
  - `monthly_logs` 作成

## Phase 2（機能置換）

- `LogPage` を月モード中心へ移行
- `weekly_logs` 利用コード削除（FE/BE）
- `insights` を測定系列へ切替

## Phase 3（クリーンアップ）

- `training_logs` の最高音列削除
- `weekly_logs` テーブル削除
- `weekly` 系バッジ/XPルールを `monthly` 系に置換

---

## 10. バッジ / XP 仕様差分

- 削除:
  - `weekly_log_saved`
  - `weekly_3` バッジ
- 追加:
  - `monthly_log_saved`
  - `monthly_3` バッジ（任意）

対象実装:
- `app/services/gamification/badge_catalog.rb`
- `app/services/gamification/progress.rb`

---

## 11. 影響ファイル一覧（実装時の主対象）

Backend:
- `config/routes.rb`
- `app/controllers/api/training_logs_controller.rb`
- `app/controllers/api/insights_controller.rb`
- `app/controllers/api/analysis_menus_controller.rb`
- `app/controllers/api/analysis_sessions_controller.rb`
- `app/controllers/api/monthly_logs_controller.rb`（新規）
- `app/models/monthly_log.rb`（新規）
- `db/migrate/*_create_monthly_logs.rb`（新規）
- `db/migrate/*_add_measurement_fields_to_analysis_sessions.rb`（新規）

Frontend:
- `frontend/src/pages/LogNewPage.tsx`
- `frontend/src/pages/TrainingPage.tsx`
- `frontend/src/pages/InsightsPage.tsx`
- `frontend/src/pages/InsightsNotesPage.tsx`
- `frontend/src/pages/InsightsMenusPage.tsx`
- `frontend/src/pages/LogPage.tsx`
- `frontend/src/api/monthlyLogs.ts`（新規）
- `frontend/src/types/monthlyLog.ts`（新規）

---

## 12. 受け入れ条件

- `/log/new` に最高音入力UIが存在しない。
- `/training` で6測定項目を実行/保存できる。
- 固定条件測定は固定音源条件以外で開始できない。
- `/insights` で測定成長グラフを確認できる。
- `/log?mode=month&month=YYYY-MM` で月ログ一覧/集計/月メモが利用できる。
- `/api/weekly_logs` に依存する画面・コードがない。

