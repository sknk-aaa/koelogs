# Performance Notes

最終更新: 2026-03-15

## 目的

Koelogs のパフォーマンス改善を、ポートフォリオとして説明できる形で整理する。

このドキュメントでは次の3点を明確にする。

- どう計測するか
- 何がボトルネックだったか
- どこまで安全に改善したか

このドキュメントでも、次の2段階を区別して整理する。

- 既存設計として最初から入っていた配慮
- 今回追加した改善

MVP を先に成立させたうえで、計測しながら安全な改善を積み上げたことを説明するためである。

## 既存設計として最初から入っていた配慮

### 1. production build を前提にしたフロント構成

フロントは React + Vite 構成で、最初から production build を前提にした資産出力になっていた。

- Vite による本番 build
- digest 付き asset 出力
- Rails production で長期 cache header

これは、最適化そのものではないが「改善を計測しやすい土台」として重要だった。

### 2. 画面責務の分離

frontend は `pages / features / api` に分かれており、画面単位の遅延読み込みを後から差し込みやすい構造だった。

### 3. production 側の配信設定

Rails production では、最初から次のような設定が入っていた。

- `eager_load = true`
- `public_file_server.headers` による静的 asset cache

そのため、今回は配信方式を壊さずに、フロントの初回ロード最適化に集中できた。

## 計測方法

### 1. フロントエンドの初回ロード計測

基本は `frontend` の production build を使って確認する。

```bash
cd frontend
npm run build
```

この結果から次を確認する。

- 初回エントリ chunk の JS サイズ
- 初回エントリ chunk の CSS サイズ
- ページごとの分割 chunk ができているか

### 2. 画面表示体感の計測

Chrome DevTools / Lighthouse を使う。

- Lighthouse
  - Performance
  - LCP
  - Total Blocking Time
  - Speed Index
- Network タブ
  - `/log` 初回表示時に何KB読み込むか
- Performance タブ
  - ルート遷移時の scripting / rendering のピーク

### 3. React 観点の計測

React DevTools Profiler を使い、次を確認する。

- `/log`
- `/training`
- `/log/notes`

特に確認したいのは以下。

- 初回 mount が重いコンポーネント
- state 更新で再描画範囲が広すぎないか
- 埋め込み TrainingPage が不要な再 render をしていないか

### 4. Backend 観点の計測

今回の安全改善は frontend を中心にしたが、今後は backend も次の方法で計測する。

- Rails development log の API 応答時間
- PostgreSQL query 数
- 重い API:
  - `/api/me`
  - `/api/measurements`
  - `/api/training_logs`
  - `/api/ai_recommendations`

## 現状分析

### ビルド前の状態

route-level lazy loading 導入前の build 結果:

- `dist/assets/index-Cd-aEanm.js`: `871.57 kB` / gzip `235.82 kB`
- `dist/assets/index-DshIfz80.css`: `703.38 kB` / gzip `110.26 kB`

この時点では Vite から chunk size warning も出ていた。

## ボトルネック

### 1. App.tsx で全ページを eager import していた

`frontend/src/App.tsx` では、`LogPage`, `TrainingPage`, `LogNotesPage`, `AiChatPage`, `CommunityPage` など重いページをすべて同期 import していた。

そのため、実際には `/log` しか開かなくても、

- TrainingPage
- LogNotesPage
- Community
- AI Chat
- Premium

のコードまで初回 bundle に含まれていた。

### 2. pages ディレクトリが大きい

サイズが大きいページ:

- `TrainingPage.tsx`: 約 `196 KB`
- `LogPage.css`: 約 `184 KB`
- `LogNotesPage.tsx`: 約 `132 KB`
- `LogPage.tsx`: 約 `128 KB`
- `TrainingPage.css`: 約 `96 KB`
- `InsightsPages.css`: 約 `88 KB`

重いページを eager import している構造と相性が悪かった。

### 3. CSS も初回ロードに寄っていた

大きな page CSS が初回 bundle にまとまって入っていたため、CSS も `703.38 kB` と大きかった。

## 今回追加した改善

### ルート単位の code splitting

`frontend/src/App.tsx` を変更し、ページコンポーネントを `React.lazy` で遅延読み込みするようにした。

対象:

- `/log`
- `/training`
- `/insights`
- `/log/notes`
- `/community`
- `/chat`
- `/premium`
- RequireAuth 配下の各ページ
- ヘルプページ

加えて、読み込み中の最小 fallback を `Suspense` で追加した。

### 改善後の build 結果

改善後の build 結果:

- `dist/assets/index-C-1QW7Uu.js`: `281.38 kB` / gzip `88.10 kB`
- `dist/assets/index-a5LQKx1y.css`: `47.71 kB` / gzip `9.52 kB`

重いページは route chunk に分離された。

例:

- `TrainingPage-DTb8JV9H.js`: `107.28 kB`
- `LogPage-D8GBe4ki.js`: `74.04 kB`
- `LogNotesPage-D0cJ39GB.js`: `72.68 kB`
- `AiChatPage-pg7BpptV.js`: `53.52 kB`

### 改善の説明ポイント

この改善は、既存の UI や API 挙動を変えずに、
「初回に必要ない画面の読み込みを後ろに送る」ことで体感速度を改善する方針である。

ポートフォリオでは次のように説明できる。

- まず production build で chunk 構成を確認した
- 初回 bundle が大きい原因を route eager import と判断した
- 安全な改善として route-level lazy loading を導入した
- その結果、初回 JS と CSS を大幅に削減できた

## 今後の改善候補

### 1. LogPage / TrainingPage のさらなる分割

現状でも大きい。

- `LogPage`
- `TrainingPage`
- `LogNotesPage`

これらはページ内でも責務が広いので、次はページ内部の feature 単位で分割すると効果が高い。

### 2. CSS の分割整理

まだ大きい CSS:

- `LogPage.css`
- `TrainingPage.css`
- `InsightsPages.css`

ページごとの責務で CSS をさらに整理すると、将来の保守性も上がる。

### 3. 重いグラフ領域の局所最適化

`/log/notes` や `/training` では SVG と録音 UI が重くなりやすい。

今後の候補:

- 表示範囲外の描画削減
- グラフ component の分離
- 状態更新の粒度見直し

### 4. Backend API の計測と N+1 確認

今回の変更は frontend 中心だが、今後は API 側も次を確認したい。

- `/api/me`
- `/api/measurements`
- `/api/training_logs`
- `/api/ai_recommendations`

## ポートフォリオでの説明例

「このプロジェクトは、最初から React + Vite の production build と Rails の静的 asset cache を前提にした構成で、計測しやすい土台はありました。そのうえで production build を実測すると、App.tsx の eager import により初回 bundle が大きいことが分かりました。そこで既存挙動を変えない安全な改善として route-level lazy loading を導入し、初回 JS を約 872KB から約 281KB に、初回 CSS を約 703KB から約 48KB に削減しました。最初から土台を作り、後から計測ベースで改善した、という流れで説明できます。」
