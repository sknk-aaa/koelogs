import { useTheme } from "../features/theme/useTheme";
import { useSettings } from "../features/settings/useSettings";

import "./SettingsPage.css";

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export default function SettingsPage() {
  const { themeMode, setThemeMode, resolvedMode } = useTheme();
  const { settings, patchSettings } = useSettings();

  const volumePct = Math.round(clamp01(settings.defaultVolume) * 100);

  return (
    <div className="page settingsPage">
      <div className="settingsPage__bg" aria-hidden="true" />

      <section className="card settingsPage__hero">
        <div className="settingsPage__kicker">Settings</div>
        <h1 className="settingsPage__title">設定</h1>
        <p className="settingsPage__sub">テーマ、再生挙動、表示の読みやすさをここで調整できます。</p>
      </section>

      <section className="card settingsPage__card">
        <div className="settingsPage__cardTitle">表示モード</div>
        <div className="settingsPage__block">
          <div className="settingsPage__label">ライト / ダーク</div>
          <div className="settingsPage__row">
            <label className={`settingsPage__pillRadio ${themeMode === "light" ? "isSelected" : ""}`}>
              <input
                type="radio"
                checked={themeMode === "light"}
                onChange={() => setThemeMode("light")}
              />
              <span>ライト</span>
            </label>
            <label className={`settingsPage__pillRadio ${themeMode === "dark" ? "isSelected" : ""}`}>
              <input
                type="radio"
                checked={themeMode === "dark"}
                onChange={() => setThemeMode("dark")}
              />
              <span>ダーク</span>
            </label>
          </div>
          <div className="settingsPage__hint">
            現在適用中: {resolvedMode === "dark" ? "ダーク" : "ライト"}
          </div>
        </div>
      </section>

      <section className="card settingsPage__card">
        <div className="settingsPage__cardTitle">トレーニング</div>

        <div className="settingsPage__block">
          <div className="settingsPage__label">トレーニング音源のデフォルト音量</div>
          <div className="settingsPage__volumeRow">
            <span className="settingsPage__volumeIcon" aria-hidden="true">
              Vol
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volumePct}
              onChange={(e) => {
                const nextPct = Number(e.target.value);
                patchSettings({ defaultVolume: clamp01(nextPct / 100) });
              }}
              className="settingsPage__range"
              aria-label="default volume"
            />
            <span className="settingsPage__volumeValue">{volumePct}%</span>
          </div>
          <div className="settingsPage__hint">次のトラック再生開始時にこの音量が初期値になります。</div>
        </div>

        <div className="settingsPage__hr" />

        <div className="settingsPage__block">
          <div className="settingsPage__label">ループ再生</div>
          <label className="settingsPage__toggle" aria-label="loop toggle">
            <input
              type="checkbox"
              checked={settings.loopEnabled}
              onChange={(e) => patchSettings({ loopEnabled: e.target.checked })}
            />
            <span className="settingsPage__toggleTrack">
              <span className="settingsPage__toggleThumb" />
            </span>
            <span className="settingsPage__toggleText">{settings.loopEnabled ? "ON" : "OFF"}</span>
          </label>
          <div className="settingsPage__hint">
            ON にすると、音源が最後まで再生されたあと自動で繰り返します。
          </div>
        </div>
      </section>

      <section className="card settingsPage__card">
        <div className="settingsPage__cardTitle">アクセシビリティ</div>
        <div className="settingsPage__block">
          <div className="settingsPage__label">フォントサイズ</div>
          <div className="settingsPage__row">
            <label className={`settingsPage__pillRadio ${settings.fontScale === "normal" ? "isSelected" : ""}`}>
              <input
                type="radio"
                checked={settings.fontScale === "normal"}
                onChange={() => patchSettings({ fontScale: "normal" })}
              />
              <span>標準</span>
            </label>

            <label className={`settingsPage__pillRadio ${settings.fontScale === "large" ? "isSelected" : ""}`}>
              <input
                type="radio"
                checked={settings.fontScale === "large"}
                onChange={() => patchSettings({ fontScale: "large" })}
              />
              <span>大きめ</span>
            </label>
          </div>
          <div className="settingsPage__hint">
            大きめは読みやすさ優先です（全体のベース文字サイズを拡大します）。
          </div>
        </div>
      </section>
    </div>
  );
}
