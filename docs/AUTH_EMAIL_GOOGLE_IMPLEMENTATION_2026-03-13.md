# AUTH_EMAIL_GOOGLE_IMPLEMENTATION_2026-03-13

2026-03-13 時点の認証実装メモ。
目的は「メール登録/メール確認/Googleログイン」を後から見返せるようにすること。

## 1. 追加したもの

### メール登録
- メール形式チェック
  - frontend: `frontend/src/utils/email.ts`
  - backend: `User` model validation
- signup 後は即ログインしない
- 確認メール送信後、`/login` に戻す

### メール確認
- `users.email_verified_at`
- `users.email_verification_token_digest`
- `users.email_verification_sent_at`
- API
  - `POST /api/auth/email_verification_requests`
  - `POST /api/auth/email_verifications`

### Googleログイン
- `users.google_sub`
- API
  - `POST /api/auth/google`
- frontend は Google Identity Services を使用
- backend は `googleauth` で ID token を検証

## 2. 現在のフロー

### メール登録
1. `/signup` で email/password を送信
2. backend で user 作成
3. email verification token を生成
4. 確認メール送信
5. frontend は `/login` へ戻し、案内文を表示

### メール確認
1. メール内リンクを開く
2. `/login?verify_token=...`
3. frontend が `POST /api/auth/email_verifications`
4. backend が token を検証
5. `email_verified_at` を保存
6. `/login` に確認完了 notice を表示

### 未確認ログイン
- `POST /api/auth/login` で拒否する
- code: `email_not_verified`
- frontend は「確認メールを再送」導線を出す

### Googleログイン
1. `/login` または `/signup` で Google ボタン押下
2. frontend が credential を取得
3. `POST /api/auth/google`
4. backend が Google ID token を検証
5. 既存ユーザーを email または `google_sub` で解決
6. session を張って `/log` へ遷移

## 3. 既存ユーザーとの整合

- `email_verified_at` 導入 migration では既存 users を backfill 済み
- 既存 email/password ログインを壊さない
- Googleログイン時、同じ email の既存ユーザーがいれば `google_sub` を紐づける
- `google_sub` が別ユーザーに紐づいている場合は拒否する

## 4. Google Cloud Console 側で必要なもの

- Web application の OAuth client
- Authorized JavaScript origins
  - 例: `http://localhost:5173`
- 同意画面の最低限設定
- 必要ならテストユーザー追加

今回の実装では `Authorized redirect URIs` は使っていない。

## 5. 環境変数

backend `.env`

```env
GOOGLE_CLIENT_ID=your_google_client_id
FRONTEND_ORIGIN=http://localhost:5173
```

frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 6. 関連ファイル

### backend
- `app/models/user.rb`
- `app/controllers/api/auth_controller.rb`
- `app/services/google_id_token_verifier.rb`
- `app/services/google_authenticator.rb`
- `app/mailers/email_verification_mailer.rb`
- `app/views/email_verification_mailer/verification_email.text.erb`
- `db/migrate/20260313120000_add_email_verification_fields_to_users.rb`
- `db/migrate/20260313133000_add_google_sub_to_users.rb`

### frontend
- `frontend/src/utils/email.ts`
- `frontend/src/api/auth.ts`
- `frontend/src/features/auth/AuthContext.ts`
- `frontend/src/features/auth/AuthProvider.tsx`
- `frontend/src/components/GoogleSignInButton.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/SignupPage.tsx`
- `frontend/src/pages/HelpContactPage.tsx`

## 7. 実装時の判断

- メール認証を先に入れてから Googleログインを足した
- Google 側の verified email のみ受け入れる
- frontend の Google ボタンは login/signup 共通部品化した
- 認証基盤は session cookie を維持したまま拡張している
