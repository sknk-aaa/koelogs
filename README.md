# voice-app

ボイストレーニングの記録・分析Webアプリです。  
日々の練習ログ管理、分析可視化、AIおすすめ、AI録音分析を提供します。

## 主な機能

- 練習ログ
  - 日付単位の記録（`/log`, `/log/new`）
  - 練習時間、メニュー、メモ、最高音（地声/裏声）
- トレーニング再生
  - スケール/テンポ選択と音源再生（`/training`）
- 分析
  - 練習時間推移
  - メニュー別分析
  - 最高音推移（`/insights*`）
- AIおすすめ
  - 直近ログをもとに当日の練習方針を生成
- AI録音分析
  - 分析メニュー作成（比較条件/詳細設定）
  - 判定項目選択
  - 分析履歴管理（`/analysis/history`）
  - 録音保存ON時は履歴で再生可能

## 技術スタック

- Backend: Ruby on Rails 8 (API) / PostgreSQL
- Frontend: React + TypeScript + Vite + React Router
- AI: Gemini 2.5 Flash API

## ルーティング（要点）

- 公開:
  - `/log`
  - `/training`
  - `/insights`, `/insights/time`, `/insights/menus`, `/insights/notes`
  - `/help/guide`, `/help/about`
  - `/login`, `/signup`
- ログイン必須:
  - `/log/new`
  - `/analysis/history`
  - `/settings`
  - `/profile`

## セットアップ

前提:
- Ruby 3.4.x
- Node.js 20+
- PostgreSQL

### 1) 依存関係インストール

```bash
bundle install
npm --prefix frontend install
```

### 2) 環境変数

プロジェクトルートの `.env` に最低限以下を設定してください。

```env
GEMINI_API_KEY=your_gemini_api_key
VITE_API_BASE_URL=http://localhost:3000
```

任意:

```env
VITE_RAILS_ORIGIN=http://localhost:3000
```

### 3) DB準備

```bash
bin/rails db:create
bin/rails db:migrate
```

### 4) 起動

Backend (Rails):

```bash
bin/rails server
```

Frontend (Vite):

```bash
npm --prefix frontend run dev
```

アクセス:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## API概要

`/api` 配下の主なエンドポイント:

- 認証
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/me`
  - `PATCH /api/me`
- ログ
  - `GET /api/training_logs`
  - `POST /api/training_logs`
- メニュー
  - `GET/POST/PATCH /api/training_menus`
  - `GET/POST/PATCH /api/analysis_menus`
- AI録音分析セッション
  - `GET/POST/DELETE /api/analysis_sessions`
  - `POST /api/analysis_sessions/:id/upload_audio`
- その他
  - `GET /api/scale_tracks`
  - `GET /api/insights`
  - `GET/POST /api/ai_recommendations`

## AI録音分析メモ

- 判定項目（詳細設定で選択）:
  - ピッチ安定度
  - 音程精度
  - 音量安定
  - 発声時間
  - 最高音
  - 発声の大きさの平均
- デフォルト:
  - ピッチ安定度 / 音程精度 / 音量安定
- 比較条件:
  - スケール / テンポ を任意固定可能
- 録音保存:
  - 「録音も保存する」ON時のみ保存
  - 履歴一覧・履歴詳細で再生可能

## 開発用コマンド

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

## ドキュメント

- UI監査: `docs/UI_AUDIT.md`
- 開発ログ: `docs/DEVLOG_2026-02-17.md`
- エージェント運用ルール: `AGENTS.md`
