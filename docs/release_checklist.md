# Release Checklist

Koelogs を公開する前に必要な準備を、カテゴリごとに整理したチェックリスト。

目的:
- 公開前に抜け漏れを防ぐ
- SaaS として最低限必要な準備を揃える
- ポートフォリオとしても「公開を見据えて設計している」ことを説明できるようにする

## 1. ドメイン・インフラ

公開前に、まず本番で動かす土台を固める。

- 独自ドメインを取得する
- `frontend` と `backend` の本番URLを確定する
- SSL/TLS を有効化する
- 本番DBのバックアップ方針を決める
- 本番環境変数を整理する
- PWA / manifest / favicon / app icon の参照先を最終確認する

Koelogs で特に重要な環境変数:
- `FRONTEND_ORIGIN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PREMIUM_MONTHLY`
- `STRIPE_PRICE_PREMIUM_QUARTERLY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- メール送信関連
- Gemini / AI関連

## 2. SEO・公開導線

公開サイトとして見つけてもらうための最低限の準備。

- `title` と `meta description` を整える
- OGP画像を用意する
- `og:title` / `og:description` / `og:image` を設定する
- `twitter:card` 系を設定する
- LP のコピーを公開向けに調整する
- `robots.txt` を用意する
- `sitemap.xml` を用意する
- インデックス対象ページを整理する

Koelogs では、`/login` や `/signup` のような認証ページよりも、LP や公開コミュニティ導線の整備を優先する。

## 3. セキュリティ

公開するときは、実装済みの対策に加えて本番運用前提の防御を確認する。

既存である程度入っているもの:
- Rails / React の基本的な安全なレンダリング
- `has_secure_password`
- Cookie Session 認証
- バリデーション
- SSL前提の運用
- 一部レート制限

公開前に追加で確認すべきもの:
- 本番 `config.hosts` の設定
- セキュリティヘッダの確認
- Cookie設定の本番確認
- CSRF方針の確定
- rate limit の閾値見直し
- `premium` と Stripe 情報の不整合ユーザーの洗い出し
- `brakeman` / `npm audit` / `bundle audit` の実行

## 4. 分析・モニタリング

公開後に改善するためには、利用状況とエラーを見える化しておく必要がある。

- GA4 または PostHog などの分析基盤を入れる
- エラーモニタリングを入れる
- サーバーログ監視を整える
- Lighthouse / 体感速度を確認する

Koelogs で追いたい主なイベント:
- LP閲覧
- signup
- login
- 初回チュートリアル完了
- 初回測定完了
- AIおすすめ生成
- Premiumページ遷移
- Checkout開始
- 購入成功

## 5. 法務

課金・コミュニティ・AI を含むサービスなので、最低限の法務整備が必要。

- 利用規約
- プライバシーポリシー
- 特商法表記
- お問い合わせ導線
- 解約 / 返金ポリシー
- コミュニティ利用ルール
- AI利用に関する注意書き

Koelogs では特に、
- AIが提案補助であること
- コミュニティ投稿が公開されること
- 録音データをどこまで保存するか
を明文化しておくとよい。

## 6. コンテンツ・プロダクト仕上げ

公開前には、実装だけでなく見せ方も整える。

- LPの文言を調整する
- 初回導線を最終確認する
- ロゴ / アイコン / OGP画像を統一する
- ヘルプページを更新する
- ゲストで試せる範囲を明確にする
- Premium訴求文言を調整する
- コミュニティの初期投稿を用意する
- 空状態UIを見直す

## 7. 課金・決済

Stripe を本番で使うなら、設定だけでなく実導線まで確認する。

- Stripe本番キーへ切り替える
- 本番 Product / Price を確認する
- 本番 Webhook を確認する
- Checkout 成功後の反映を確認する
- Billing Portal を確認する
- 解約予定状態を確認する
- 無料 -> 有料 -> 解約予定 -> 無料復帰の一連を確認する
- テスト残骸ユーザーを整理する

Koelogs では、過去に `plan_tier` と Stripe 情報の不整合が起きていたため、公開前に必ず整合性確認を行う。

## 8. 品質保証

公開前に最低限の動作確認を通す。

- CI が通る状態にする
- backend / frontend のテストを通す
- 主要導線を手動確認する
- モバイル実機確認
- Safari確認
- ダークモード確認
- 本番build確認

Koelogs で優先度の高い確認項目:
- signup
- login
- email verification
- password reset
- log作成
- measurement保存
- Insights反映
- AIおすすめ生成
- community投稿 / お気に入り
- Premium決済

## 9. 公開後運用

公開はスタートなので、運用面も先に考えておく。

- 障害時の連絡手順
- バックアップ確認
- 問い合わせ対応フロー
- 課金問い合わせ対応フロー
- コミュニティ監視方針
- リリース後に見るKPIの決定

Koelogs の初期KPI候補:
- signup率
- 初回測定完了率
- AIおすすめ生成率
- 7日継続率
- Premium遷移率
- 購入率

---

## Koelogs 公開前チェックリスト

### ドメイン・インフラ
- [ ] 独自ドメインを取得する
- [ ] `frontend` / `backend` の本番URLを確定する
- [ ] SSL/TLS を有効化する
- [ ] 本番DBのバックアップ方針を決める
- [ ] 本番環境変数を整理する
- [ ] PWA / manifest / favicon / app icon を最終確認する

### SEO・公開導線
- [ ] `title` と `meta description` を整える
- [ ] OGP画像を用意する
- [ ] OGP / Twitter Card を設定する
- [ ] LP文言を公開向けに最終調整する
- [ ] `robots.txt` を用意する
- [ ] `sitemap.xml` を用意する

### セキュリティ
- [ ] 本番 `config.hosts` を有効にする
- [ ] セキュリティヘッダを確認する
- [ ] Cookie設定を本番前提で確認する
- [ ] CSRF対応方針を決める
- [ ] rate limit の本番閾値を見直す
- [ ] `premium` 状態と Stripe 情報の不整合ユーザーを洗い出す
- [ ] `brakeman` を実行する
- [ ] `npm audit` を実行する
- [ ] 必要なら `bundle audit` を実行する

### 分析・モニタリング
- [ ] GA4 または PostHog を導入する
- [ ] Sentry などのエラーモニタリングを導入する
- [ ] 主要イベントを設計する
- [ ] Lighthouse と体感速度を確認する

### 法務
- [ ] 利用規約を用意する
- [ ] プライバシーポリシーを用意する
- [ ] 特商法表記を用意する
- [ ] お問い合わせ導線を確認する
- [ ] 返金 / 解約ポリシーを整理する
- [ ] コミュニティ利用ルールを整理する
- [ ] AI利用に関する注意書きを用意する

### コンテンツ・プロダクト仕上げ
- [ ] LPの文言を整える
- [ ] 初回チュートリアルを最終確認する
- [ ] ロゴ / アイコン / OGP画像を統一する
- [ ] ヘルプページを更新する
- [ ] ゲスト導線を最終確認する
- [ ] Premium訴求文言を整える
- [ ] コミュニティの初期投稿を用意する
- [ ] 空状態UIを見直す

### 課金・決済
- [ ] Stripe本番キーへ切り替える
- [ ] 本番 Product / Price を確認する
- [ ] 本番 Webhook を確認する
- [ ] Checkout成功後の反映を確認する
- [ ] Billing Portal を確認する
- [ ] 解約予定状態の表示を確認する
- [ ] 無料 -> 有料 -> 解約予定 -> 無料復帰を確認する
- [ ] テスト残骸ユーザーを整理する

### 品質保証
- [ ] CI が通ることを確認する
- [ ] backend / frontend のテストを通す
- [ ] signup / login / password reset を確認する
- [ ] log作成を確認する
- [ ] measurement保存とInsights反映を確認する
- [ ] AIおすすめ生成を確認する
- [ ] community投稿 / お気に入りを確認する
- [ ] Premium決済を確認する
- [ ] モバイル実機で確認する
- [ ] Safariで確認する
- [ ] ダークモードを確認する
- [ ] 本番buildを確認する

### 公開後運用
- [ ] 障害時の連絡手順を決める
- [ ] バックアップ復元手順を確認する
- [ ] 問い合わせ対応フローを決める
- [ ] 課金問い合わせ対応フローを決める
- [ ] コミュニティ監視方針を決める
- [ ] 公開後に見るKPIを決める

