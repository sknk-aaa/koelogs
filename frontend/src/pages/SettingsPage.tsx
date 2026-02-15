import { THEMES } from "../features/theme/themes";
import { useTheme } from "../features/theme/useTheme";
import { useSettings } from "../features/settings/useSettings";

import "./SettingsPage.css";

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export default function SettingsPage() {
  const { themeKey, setThemeKey } = useTheme();
  const { settings, patchSettings } = useSettings();

  const volumePct = Math.round(clamp01(settings.defaultVolume) * 100);

  return (
    <div className="page settingsPage">
      <h1 className="h1">設定</h1>
      <p className="p">テーマや動作設定を変更できます（端末に保存されます）。</p>

      {/* テーマ */}
      <div className="card settingsPage__card">
        <div className="settingsPage__cardTitle">テーマカラー</div>

        <div className="settingsPage__themeGrid">
          {THEMES.map((t) => {
            const selected = t.key === themeKey;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setThemeKey(t.key)}
                className={`settingsPage__themeBtn ${selected ? "isSelected" : ""}`}
              >
                <span className="settingsPage__swatchWrap">
                  <span
                    className="settingsPage__swatch"
                    style={{ background: t.vars["--accent"] }}
                  />
                  <span
                    className="settingsPage__swatch"
                    style={{ background: t.vars["--accentSoft"] }}
                  />
                </span>

                <span className="settingsPage__themeName">
                  {t.name}
                  {selected ? <span className="settingsPage__selectedDot"> ●</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* トレーニング */}
      <div className="card settingsPage__card">
        <div className="settingsPage__cardTitle">トレーニング</div>

        <div className="settingsPage__block">
          <div className="settingsPage__label">トレーニング音源のデフォルト音量</div>

          <div className="settingsPage__volumeRow">
            <span className="settingsPage__volumeIcon" aria-hidden="true">
              🔉
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

          <div className="settingsPage__hint">
            次のトラック再生開始時にこの音量が初期値になります。
          </div>
        </div>

        <div className="settingsPage__hr" />

        <div className="settingsPage__block">
          <div className="settingsPage__label">ループ再生</div>

          <label className="settingsPage__toggle">
            <input
              type="checkbox"
              checked={settings.loopEnabled}
              onChange={(e) => patchSettings({ loopEnabled: e.target.checked })}
            />
            <span>{settings.loopEnabled ? "ON" : "OFF"}</span>
          </label>

          <div className="settingsPage__hint">
            ON にすると、音源が 끝まで再生されたあと自動で繰り返します。
          </div>
        </div>
      </div>

      {/* AIおすすめ */}
      <div className="card settingsPage__card">
        <div className="settingsPage__cardTitle">AIおすすめ</div>

        <div className="settingsPage__block">
          <div className="settingsPage__label">参照日数（今日を除く直近）</div>

          <div className="settingsPage__row">
            <label className="settingsPage__pillRadio">
              <input
                type="radio"
                checked={settings.aiRangeDays === 7}
                onChange={() => patchSettings({ aiRangeDays: 7 })}
              />
              <span>7日</span>
            </label>

            <label className="settingsPage__pillRadio">
              <input
                type="radio"
                checked={settings.aiRangeDays === 14}
                onChange={() => patchSettings({ aiRangeDays: 14 })}
              />
              <span>14日</span>
            </label>
          </div>

          <div className="settingsPage__hint">
            日数を増やすと安定した提案になりやすい一方、直近の変化には鈍くなります。
          </div>
        </div>
      </div>

      {/* アクセシビリティ */}
      <div className="card settingsPage__card">
        <div className="settingsPage__cardTitle">アクセシビリティ</div>

        <div className="settingsPage__block">
          <div className="settingsPage__label">フォントサイズ</div>

          <div className="settingsPage__row">
            <label className="settingsPage__pillRadio">
              <input
                type="radio"
                checked={settings.fontScale === "normal"}
                onChange={() => patchSettings({ fontScale: "normal" })}
              />
              <span>標準</span>
            </label>

            <label className="settingsPage__pillRadio">
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
      </div>
    </div>
  );
}
