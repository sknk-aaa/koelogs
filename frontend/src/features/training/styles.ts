import type React from "react";

const SOFT_BORDER = "1px solid rgba(0,0,0,0.05)";
const SHADOW = "0 18px 36px rgba(0,0,0,0.10)";
const CARD_BG = "rgba(255,255,255,0.86)";

export const styles: Record<string, React.CSSProperties> = {
  // TrainingPage 最上位
  page: {
    minHeight: "100%",
    background: "transparent",
    color: "#1d1d1f",
    display: "flex",
    justifyContent: "center",
    padding: "clamp(12px, 3.5vw, 28px) clamp(12px, 4vw, 36px) 0",
  },

  // 中央寄せ（スマホ〜タブレット）
  shell: {
    width: "min(100%, 920px)",
    maxWidth: "clamp(360px, 92vw, 920px)",
  },

  // 共通Header/Footerがある前提なのでTraining側は隠す
  header: { display: "none" },
  footer: { display: "none" },
  footerText: { display: "none" },
  title: { display: "none" },
  subtitle: { display: "none" },

  /**
   * 以前の大カードを捨てる（ここ重要）
   * JSXは main に styles.card が当たっているはずなので
   * それを透明コンテナ化して「全部がカード内」問題を解消する
   */
  card: {
    background: "transparent",
    border: "none",
    borderRadius: 0,
    padding: 0,
    boxShadow: "none",
    backdropFilter: "none",
  },

  /**
   * 縦の間隔（画像っぽい）
   */
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: "clamp(14px, 2.6vw, 22px)",
  },

  /**
   * スケール/テンポは“カードにしない”
   * → 余白と幅だけ整えて、画像の上部の並びに寄せる
   */
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  label: {
    fontSize: "clamp(14px, 1.7vw, 16px)",
    fontWeight: 800,
    color: "#3a3a3c",
    letterSpacing: 0.2,
  },

  // スケール：白い丸い入力っぽく
  select: {
    height: 46,
    borderRadius: 18,
    border: "1px solid rgba(0,0,0,0.06)",
    background: "rgba(255,255,255,0.95)",
    color: "#1d1d1f",
    padding: "0 14px",
    outline: "none",
    boxShadow: "0 12px 26px rgba(0,0,0,0.08)",
    WebkitAppearance: "none",
    appearance: "none",
  },

  // テンポ：セグメント（画像の薄グレー台＋選択ピンク）
  segmentWrap: {
    background: "#efeff4",
    borderRadius: 20,
    padding: 5,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    border: "1px solid rgba(0,0,0,0.05)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
  },

  segmentBtn: {
    height: 44,
    borderRadius: 18,
    border: "none",
    background: "transparent",
    color: "#6b6b70",
    fontWeight: 900,
    cursor: "pointer",
    letterSpacing: 0.2,
  },

  segmentBtnActive: {
    background: "rgba(255, 105, 120, 0.22)",
    color: "#ff3b45",
    boxShadow: "0 12px 24px rgba(255, 59, 69, 0.14)",
  },

  /**
   * 再生まわりだけ「カード」にして主役感を出す
   */
  audioStack: {
    background: CARD_BG,
    border: SOFT_BORDER,
    borderRadius: "clamp(20px, 2.4vw, 26px)",
    padding: "clamp(14px, 2.4vw, 18px)",
    boxShadow: SHADOW,
    display: "flex",
    flexDirection: "column",
    gap: "clamp(12px, 2vw, 16px)",
  },

  // Playボタン：大きいピル
  button: {
    height: 52,
    borderRadius: 22,
    border: 0,
    background: "linear-gradient(180deg, #ff6a6f 0%, #ff4d57 100%)",
    color: "#fff",
    padding: "0 16px",
    cursor: "pointer",
    fontWeight: 900,
    letterSpacing: 0.3,
    boxShadow: "0 18px 28px rgba(255, 77, 87, 0.26)",
  },

  buttonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
    boxShadow: "none",
    background: "rgba(0,0,0,0.10)",
    color: "rgba(0,0,0,0.40)",
  },

  // 標準audio（内部デザインはブラウザ依存）
  audio: {
    width: "100%",
    borderRadius: 18,
    background: "#2c2c2e",
    boxShadow: "0 16px 28px rgba(0,0,0,0.14)",
  },

  player: { marginTop: 0 },

  // 音量：画像の下の薄いバーっぽく
  // 右寄せは marginLeft:auto で安全に
  volumeRow: {
    width: "70%",
    marginLeft: "auto",
    display: "grid",
    gridTemplateColumns: "28px 1fr 52px",
    gap: 10,
    alignItems: "center",
    background: "#f2f2f7",
    borderRadius: 18,
    padding: "10px 12px",
    border: "1px solid rgba(0,0,0,0.04)",
  },

  volumeLabel: {
    fontSize: 14,
    fontWeight: 900,
    color: "#9a9aa0",
    textAlign: "center",
  },

  volumeValue: {
    fontSize: 12,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 900,
    color: "#6b6b70",
    whiteSpace: "nowrap",
  },

  volumeSlider: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    accentColor: "#ff4d57",
  },

  /**
   * 下の説明カード（画像のピンクカード枠）
   * ここはカード化してOK。情報が独立して見える。
   */
  statusArea: {
    background:
      "linear-gradient(180deg, rgba(255,210,214,0.65) 0%, rgba(255,255,255,0.65) 100%)",
    border: "1px solid rgba(255,77,87,0.12)",
    borderRadius: "clamp(18px, 2.2vw, 22px)",
    padding: "clamp(12px, 2vw, 16px)",
    boxShadow: "0 16px 30px rgba(255,77,87,0.10)",
    minHeight: 0,
  },

  muted: {
    margin: 0,
    color: "#3a3a3c",
    fontSize: 13,
    fontWeight: 700,
  },
};
