import { useTheme } from "../features/theme/useTheme";
import { useSettings } from "../features/settings/useSettings";

import "./SettingsPage.css";

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function renderSettingsSectionIcon(kind: "display" | "training" | "readability") {
  if (kind === "display") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <rect x="4.5" y="5.5" width="15" height="10.5" rx="2.2" />
        <path d="M9 19h6" />
        <path d="M12 16v3" />
      </svg>
    );
  }
  if (kind === "training") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="11.5" cy="12.2" r="7.2" />
        <path d="M11.5 8.4v4.2l2.8 1.8" />
        <path className="accent" d="M18.3 4.8v3.1" />
        <path className="accent" d="M16.8 6.35h3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 4v16" />
      <path d="M6.5 8.2h2.3" />
      <path d="M6.5 15.8h2.3" />
      <path d="M15.2 8.2h2.3" />
      <path d="M15.2 15.8h2.3" />
      <circle className="accent-fill" cx="12" cy="12" r="2.1" />
    </svg>
  );
}

export default function SettingsPage() {
  const { themeMode, setThemeMode } = useTheme();
  const { settings, patchSettings } = useSettings();

  const volumePct = Math.round(clamp01(settings.defaultVolume) * 100);

      return (
    <div className="page settingsPage">
      <section className="settingsPage__section">
        <div className="settingsPage__sectionHead">
          <div className="settingsPage__sectionHeadMain">
            <span className="settingsPage__sectionIcon" aria-hidden="true">
              {renderSettingsSectionIcon("display")}
            </span>
            <div>
              <div className="settingsPage__sectionEyebrow">DISPLAY</div>
            </div>
          </div>
        </div>
        <div className="settingsPage__block">
          <div className="settingsPage__hint settingsPage__hint--sectionLead">
            アプリ全体のテーマを設定できます。
          </div>
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
        </div>
      </section>

      <section className="settingsPage__section">
        <div className="settingsPage__sectionHead">
          <div className="settingsPage__sectionHeadMain">
            <span className="settingsPage__sectionIcon" aria-hidden="true">
              {renderSettingsSectionIcon("training")}
            </span>
            <div>
              <div className="settingsPage__sectionEyebrow">TRAINING</div>
            </div>
          </div>
        </div>

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

      <section className="settingsPage__section">
        <div className="settingsPage__sectionHead">
          <div className="settingsPage__sectionHeadMain">
            <span className="settingsPage__sectionIcon" aria-hidden="true">
              {renderSettingsSectionIcon("readability")}
            </span>
            <div>
              <div className="settingsPage__sectionEyebrow">READABILITY</div>
            </div>
          </div>
        </div>
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
