import { NavLink } from "react-router-dom";

// 画像をimport（ViteならこれでOK）
import logActive from "../assets/tabs/log_active.png";
import logInactive from "../assets/tabs/log_inactive.png";
import trainingActive from "../assets/tabs/training_active.png";
import trainingInactive from "../assets/tabs/training_inactive.png";
import insightsActive from "../assets/tabs/insights_active.png";
import insightsInactive from "../assets/tabs/insights_inactive.png";

type TabKey = "log" | "training" | "insights";

const TABS: {
  key: TabKey;
  label: string;
  to: string;
  iconActive: string;
  iconInactive: string;
}[] = [
  {
    key: "log",
    label: "ログ",
    to: "/log",
    iconActive: logActive,
    iconInactive: logInactive,
  },
  {
    key: "training",
    label: "トレーニング",
    to: "/training",
    iconActive: trainingActive,
    iconInactive: trainingInactive,
  },
  {
    key: "insights",
    label: "分析",
    to: "/insights",
    iconActive: insightsActive,
    iconInactive: insightsInactive,
  },
];

export default function AppFooterTabs() {
  return (
    <nav style={styles.nav} aria-label="mode tabs">
      {TABS.map((t) => (
        <NavLink
          key={t.key}
          to={t.to}
          style={({ isActive }) => ({
            ...styles.tab,
            ...(isActive ? styles.tabActive : null),
          })}
        >
          {({ isActive }) => (
            <>
              <img
                src={isActive ? t.iconActive : t.iconInactive}
                alt=""
                aria-hidden="true"
                style={{
                  ...styles.iconImg,
                  ...(isActive ? styles.iconImgActive : null),
                }}
              />
              <div style={styles.label}>{t.label}</div>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const TAB_BAR_H = 58; // ベース高さ（画像っぽい。56〜60で調整可）

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "fixed",
    width: "100%",
    bottom: 0,
    zIndex: 60,

    // ✅ 高さは“safe-area込みの合計”にする（固定にしない）
    height: `calc(${TAB_BAR_H}px + env(safe-area-inset-bottom))`,
    paddingBottom: "env(safe-area-inset-bottom)",

    background: "rgb(255, 255, 255)",
    backdropFilter: "blur(10px)",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
  },

  tab: {
    textDecoration: "none",
    color: "#8e8e93",

    // ✅ 高さいっぱいに広げる（tabの中心がズレない）
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",

    gap: 3,
    paddingTop: 6,
    fontWeight: 700,
    WebkitTapHighlightColor: "transparent",
  },

  tabActive: { color: "#ff3b45" },

  iconImg: {
    width: 24,
    height: 24,
    objectFit: "contain",
    display: "block",
  },

  label: { fontSize: 12 },
};