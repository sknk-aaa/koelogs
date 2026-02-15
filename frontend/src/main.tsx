import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import "./styles/base.css";
import "./styles/page.css";

import { ThemeProvider } from "./features/theme/ThemeProvider";
import { SettingsProvider } from "./features/settings/SettingsProvider";

if (window.location.hostname === "127.0.0.1") {
  const url = new URL(window.location.href);
  url.hostname = "localhost";
  window.location.replace(url.toString());
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