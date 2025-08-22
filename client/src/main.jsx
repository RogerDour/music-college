/* eslint-disable react-refresh/only-export-components */

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";

import "./index.css";
import App from "./App.jsx";
import i18n from "./utils/i18n";
import { themeLtr, themeRtl } from "./theme";

// Ensure correct dir/lang on first paint
const isHebrew = i18n.language === "he";
document.documentElement.setAttribute("dir", isHebrew ? "rtl" : "ltr");
document.documentElement.setAttribute("lang", isHebrew ? "he" : "en");

// Update dir/lang when language changes
i18n.on("languageChanged", (lng) => {
  document.documentElement.setAttribute("dir", lng === "he" ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lng);
});

function RtlProvider({ children }) {
  const he = i18n.language === "he";
  const cache = createCache({
    key: he ? "mui-rtl" : "mui",
    stylisPlugins: he ? [rtlPlugin] : [],
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={he ? themeRtl : themeLtr}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <RtlProvider>
        <App />
      </RtlProvider>
    </BrowserRouter>
  </StrictMode>,
);

export {};