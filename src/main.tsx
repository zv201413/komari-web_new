import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import "@radix-ui/themes/styles.css";
import { BrowserRouter } from "react-router-dom";
// Ensure i18n is initialized before any component renders
import "./i18n/config";
import ErrorBoundary from "./components/ErrorBoundary";
import { Suspense } from "react";
import { useRoutes } from "react-router-dom";
import { routes } from "./routes";
import Loading from "./components/loading";
import { PublicInfoProvider } from "./contexts/PublicInfoContext";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { AppearanceRuntime } from "./components/AppearanceRuntime";
import { RPC2Provider } from "./contexts/RPC2Context";
import { ConfigProvider } from "./config";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useThemeManager } from "./hooks/useTheme";
import { Theme } from "@radix-ui/themes";
import { Toaster } from "./components/ui/sonner";

const App = () => {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tempKey = params.get("temp_key");

    if (tempKey) {
      document.cookie = `temp_key=${tempKey}; path=/; max-age=${60 * 60 * 24 * 365 * 100}`;
      params.delete("temp_key");
      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`,
      );
    }
  }, []);

  const themeManager = useThemeManager();
  const routing = useRoutes(routes);
  return (
    <Suspense fallback={<Loading />}>
      <RPC2Provider>
        <PublicInfoProvider>
          <ConfigProvider>
            <ThemeProvider value={themeManager}>
              <Theme
                appearance={themeManager.appearance}
                accentColor={themeManager.color}
                scaling="110%"
                style={{ backgroundColor: "transparent" }}
              >
                <AppearanceRuntime />
                <OfflineIndicator />
                <Toaster />
                {routing}
                <PWAInstallPrompt />
                <PWAUpdatePrompt />
              </Theme>
            </ThemeProvider>
          </ConfigProvider>
        </PublicInfoProvider>
      </RPC2Provider>
    </Suspense>
  );
};

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  </ErrorBoundary>,
);
