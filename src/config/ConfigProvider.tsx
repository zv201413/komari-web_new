import { type ReactNode, useEffect, useState, useMemo } from "react";
import type { PublicInfo } from "@/types/node.d";
import { ConfigContext } from "./ConfigContext";
import { DEFAULT_CONFIG, type ConfigOptions, type SiteStatus } from "./default";
import { apiService } from "@/services/api";
import Loading from "@/components/loading";
import { defaultTexts, otherTexts } from "./locales";
import { mergeTexts, deepMerge } from "@/utils/localeUtils";
import { usePublicInfo } from "@/contexts/PublicInfoContext";

// 配置提供者属性类型
interface ConfigProviderProps {
  children: ReactNode;
}

/**
 * 配置提供者组件 — 桥接主项目的 PublicInfoContext
 * 从 PublicInfoContext 获取 publicInfo，而不是自行调用 apiService
 */
export function ConfigProvider({ children }: ConfigProviderProps) {
  const { publicInfo: rawPublicInfo, isLoading: publicInfoLoading } = usePublicInfo();
  const [config, setConfig] = useState<ConfigOptions | null>(null);
  const [siteStatus, setSiteStatus] = useState<SiteStatus>("public");
  const [previewConfig, setPreviewConfig] =
    useState<Partial<ConfigOptions> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 将 rawPublicInfo 类型适配为 PurCarte 期望的 PublicInfo
  const publicSettings = rawPublicInfo as unknown as PublicInfo | null;

  useEffect(() => {
    if (publicInfoLoading) return;

    const init = async () => {
      try {
        // 检查登录状态
        const meResponse = await apiService.getUserInfo();
        const isLoggedIn = meResponse?.logged_in || false;

        if (publicSettings) {
          if (publicSettings.private_site) {
            setSiteStatus(isLoggedIn ? "private-authenticated" : "private-unauthenticated");
          } else {
            setSiteStatus(isLoggedIn ? "authenticated" : "public");
          }

          const themeSettings = (publicSettings.theme_settings as ConfigOptions) || {};
          const mergedConfig: ConfigOptions = {
            ...DEFAULT_CONFIG,
            ...themeSettings,
            titleText:
              themeSettings.titleText ||
              publicSettings.sitename ||
              DEFAULT_CONFIG.titleText,
          };
          setConfig(mergedConfig);

          // Initialize RPC — 主项目已全面使用 RPC2，始终启用
          apiService.useRpc = true;
        } else {
          setConfig(DEFAULT_CONFIG);
          setSiteStatus("private-unauthenticated");
        }
      } catch (error) {
        console.error("Failed to initialize site:", error);
        setConfig(DEFAULT_CONFIG);
        setSiteStatus("private-unauthenticated");
      } finally {
        setTimeout(() => setIsLoaded(true), 300);
      }
    };

    init();
  }, [publicInfoLoading, publicSettings]);

  const texts = useMemo(() => {
    const activeConfig = previewConfig
      ? { ...config, ...previewConfig }
      : config;
    const baseTexts = activeConfig?.customTexts
      ? mergeTexts(defaultTexts, activeConfig.customTexts)
      : defaultTexts;
    return deepMerge(baseTexts, otherTexts);
  }, [config, previewConfig]);

  const updatePreviewConfig = (newConfig: Partial<ConfigOptions>) => {
    setPreviewConfig(newConfig);
  };

  const reloadConfig = async () => {
    // 由于配置现在来自 PublicInfoContext，重新加载可以触发 publicInfo refresh
    setIsLoaded(false);
    // 简单地重新计算
    if (publicSettings) {
      const themeSettings = (publicSettings.theme_settings as ConfigOptions) || {};
      const mergedConfig: ConfigOptions = {
        ...DEFAULT_CONFIG,
        ...themeSettings,
        titleText:
          themeSettings.titleText ||
          publicSettings.sitename ||
          DEFAULT_CONFIG.titleText,
      };
      setConfig(mergedConfig);
    }
    setTimeout(() => setIsLoaded(true), 300);
  };

  const activeConfig = useMemo(
    () =>
      previewConfig
        ? { ...(config || DEFAULT_CONFIG), ...previewConfig }
        : config || DEFAULT_CONFIG,
    [config, previewConfig]
  );

  if (!isLoaded || !config) {
    return (
      <Loading text="加载配置中..." className={isLoaded ? "fade-out" : ""} />
    );
  }

  return (
    <ConfigContext.Provider
      value={{
        ...activeConfig,
        titleText: config?.titleText || DEFAULT_CONFIG.titleText,
        publicSettings,
        siteStatus,
        texts,
        previewConfig,
        updatePreviewConfig,
        reloadConfig,
      }}>
      {children}
    </ConfigContext.Provider>
  );
}
