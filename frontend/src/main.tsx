import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import "./styles/base.css";
import "./styles/theme.css";
import "./styles/page.css";
import "./styles/drawer.css";
import "./styles/improvement-tags.css";

import { ThemeProvider } from "./features/theme/ThemeProvider";
import { SettingsProvider } from "./features/settings/SettingsProvider";

if (window.location.hostname === "127.0.0.1") {
  const url = new URL(window.location.href);
  url.hostname = "localhost";
  window.location.replace(url.toString());
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("Service worker registration failed", error);
    });
  });
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>
);
