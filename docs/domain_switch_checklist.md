# 独自ドメイン切替チェックリスト

このドキュメントは、Koelogs を Render の仮 URL から独自ドメインへ切り替える際に必要な変更点と確認項目をまとめたものです。

対象:
- frontend: `https://koelogs-frontend-vgkk.onrender.com`
- backend: `https://koelogs-backend.onrender.com`

独自ドメイン反映後は、以下を順番に確認・更新してください。

## 1. 確定する URL

- frontend 本番 URL
- backend 本番 URL

例:
- frontend: `https://app.example.com`
- backend: `https://api.example.com`

この 2 つが決まったら、以降の設定はすべてこの URL に揃えます。

## 2. Render 環境変数

### backend

- `FRONTEND_ORIGIN`
  - 例: `https://app.example.com`
- `MAILER_HOST`
  - 例: `app.example.com`
- `APP_HOSTS`
  - 例: `api.example.com,app.example.com`

### frontend

- `VITE_API_BASE_URL`
  - 例: `https://api.example.com`
- `VITE_RAILS_ORIGIN`
  - 例: `https://api.example.com`

補足:
- `VITE_*` は frontend の Static Site 側に設定します
- `FRONTEND_ORIGIN` は backend の Web Service 側に設定します

## 3. Google Cloud Console

Google ログインを使うため、以下を更新します。

- `Authorized JavaScript origins`
  - frontend の独自ドメインを追加
- 必要に応じて既存の Render URL を残すか削除する

確認項目:
- Google 新規登録が通る
- Google ログインが通る
- ログイン後に `/api/me` が `200` になる

## 4. Stripe

独自ドメイン確定後は、URL 依存の設定を見直します。

- Webhook endpoint URL
  - 例: `https://api.example.com/api/billing/webhook`
- frontend 復帰先
  - backend の `FRONTEND_ORIGIN` が新 URL になっているか確認

確認項目:
- Checkout へ遷移できる
- 購入後に frontend へ戻る
- `/plan` の `契約を管理` が開く
- 解約予定状態の表示が崩れない

## 5. SEO / OGP

以下の URL を独自ドメインへ差し替えます。

対象ファイル:
- `frontend/index.html`
- `frontend/public/robots.txt`
- `frontend/public/sitemap.xml`

### frontend/index.html

- `canonical`
- `og:url`
- `og:image`
- `twitter:image`

### frontend/public/robots.txt

- `Sitemap:` の URL

### frontend/public/sitemap.xml

- `<loc>` の URL

補足:
- OGP 画像ファイル自体はそのまま使えます
- URL だけ独自ドメインへ変更すれば OK です

## 6. メール送信

確認項目:
- メール確認リンクが独自ドメインを向いている
- パスワード再設定リンクが独自ドメインを向いている
- `MAILER_HOST` 変更後もメール送信が通る

## 7. 認証 / セッション

Koelogs は Cookie Session 認証を使っているため、ドメイン切替後もセッションが維持されるか確認します。

確認項目:
- メールログイン後に `/api/me` が `200` になる
- Google ログイン後に `/api/me` が `200` になる
- ログアウトが通る
- ログイン状態がページ遷移で維持される

## 8. コア機能確認

切替後に最低限見るべきもの:

- `/log` が開く
- `/training` で音源再生できる
- 測定保存ができる
- `/chat` が開く
- `/community` が開く
- `/premium` が開く
- `/plan` が開く
- 法務ページが見られる

## 9. 最終確認チェックリスト

- [ ] frontend 独自ドメインを Render に設定した
- [ ] backend 独自ドメインを Render に設定した
- [ ] backend の `FRONTEND_ORIGIN` を更新した
- [ ] frontend の `VITE_API_BASE_URL` を更新した
- [ ] frontend の `VITE_RAILS_ORIGIN` を更新した
- [ ] backend の `MAILER_HOST` を更新した
- [ ] backend の `APP_HOSTS` を更新した
- [ ] Google Cloud Console の origin を更新した
- [ ] Stripe webhook URL を更新した
- [ ] `canonical` を更新した
- [ ] `og:url` を更新した
- [ ] `og:image` を更新した
- [ ] `twitter:image` を更新した
- [ ] `robots.txt` の sitemap URL を更新した
- [ ] `sitemap.xml` の URL を更新した
- [ ] メールログインを確認した
- [ ] Google ログインを確認した
- [ ] 測定保存を確認した
- [ ] 音源再生を確認した
- [ ] Premium 導線を確認した
- [ ] 法務ページを確認した

