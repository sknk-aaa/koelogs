import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import "./styles/base.css";
import "./styles/page.css";

import { ThemeProvider } from "./features/theme/ThemeProvider";
import { SettingsProvider } from "./features/settings/SettingsProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>
);