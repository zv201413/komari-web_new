import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppConfig } from "@/config/hooks";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/hooks/useTheme";
import { resolveAppearance, parseBackgroundImages, parseAlignment } from "@/config/parse";

/**
 * 根级外观运行时。
 *
 * 挂在 React 树顶层（main.tsx，即 /admin 与 /* 公共树的最近公共祖先），
 * 声明式地完成两件事：
 *  1. 注入可配置的 CSS 变量（--main-width / --purcarte-blur / --card-light / --card-dark）；
 *  2. 渲染背景图层（图片 + 可选视频）。
 *
 * 取代旧 DynamicContent 里命令式的 getElementById + element.style 写法，
 * 并让后台与公共站共用同一套背景与毛玻璃变量（后台玻璃因此自动跟随全站配置）。
 */
export function AppearanceRuntime() {
  const config = useAppConfig();
  const isMobile = useIsMobile();
  const { appearance } = useTheme();
  const [isPortrait, setIsPortrait] = useState(false);
  const [randomTick, setRandomTick] = useState(0);

  useEffect(() => {
    const checkPortrait = () =>
      setIsPortrait(window.innerHeight > window.innerWidth);
    checkPortrait();
    window.addEventListener("resize", checkPortrait);
    return () => window.removeEventListener("resize", checkPortrait);
  }, []);

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = Math.random() * 20 * 60 * 1000;
      tid = setTimeout(() => {
        setRandomTick((t) => t + 1);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(tid);
  }, []);

  const getUrlFromConfig = useCallback(
    (urls: string) => {
      if (!urls) return "";
      const urlList = urls.split("|").map((u) => u.trim());
      if (urlList.length > 1) {
        return appearance === "dark" ? urlList[1] : urlList[0];
      }
      return urlList[0];
    },
    [appearance]
  );

  // 选定背景图：复数列表随机抽一张（轮换依赖 randomTick），其自带 size/position
  // 逐字段回退到全局 backgroundAlignment；列表为空时回退单数图（pipe light|dark，无 per-image）。
  const pickedImage = useMemo(() => {
    const fallback = parseAlignment(config?.backgroundAlignment);
    if (!config)
      return { url: "", size: fallback.size, position: fallback.position };

    const isMob = isMobile || isPortrait;
    const multi =
      isMob &&
      config.backgroundImagesMobile &&
      config.backgroundImagesMobile !== "[]"
        ? config.backgroundImagesMobile
        : config.backgroundImages;
    const single =
      isMob && config.backgroundImageMobile
        ? config.backgroundImageMobile
        : config.backgroundImage;

    const entries = parseBackgroundImages(multi);
    if (entries.length > 0) {
      const picked = entries[Math.floor(Math.random() * entries.length)];
      return {
        url: getUrlFromConfig(picked.url),
        size: picked.size ?? fallback.size,
        position: picked.position ?? fallback.position,
      };
    }
    return {
      url: getUrlFromConfig(single || ""),
      size: fallback.size,
      position: fallback.position,
    };
  }, [config, isMobile, isPortrait, getUrlFromConfig, randomTick]);

  const videoUrl = useMemo(() => {
    if (!config || !config.enableVideoBackground) return "";
    const { videoBackgroundUrl, videoBackgroundUrlMobile } = config;
    return isMobile && videoBackgroundUrlMobile
      ? getUrlFromConfig(videoBackgroundUrlMobile)
      : getUrlFromConfig(videoBackgroundUrl);
  }, [config, isMobile, getUrlFromConfig]);

  // 集中解析：图片/视频对齐、玻璃底色、模糊值都来自 config/parse.ts。
  // 视频对齐独立于图片（videoBackgroundAlignment 为空时回退到 backgroundAlignment），
  // 且 object-fit 经白名单收敛，避免“图片合法但视频非法”的取值静默失效。
  const appearanceStyles = useMemo(() => resolveAppearance(config), [config]);

  const dynamicStyles = useMemo(() => {
    if (!config) return "";
    const { glass, blurPx } = appearanceStyles;
    const styles: string[] = [
      `--main-width: ${config.mainWidth}vw;`,
      `--body-background-url: url(${pickedImage.url});`,
      `--purcarte-blur: ${blurPx}px;`,
      `--card-light: ${glass.light};`,
      `--card-dark: ${glass.dark};`,
    ];
    return `:root { ${styles.join(" ")} }`;
  }, [config, pickedImage, appearanceStyles]);

  const showVideo = Boolean(config?.enableVideoBackground && videoUrl);

  return (
    <>
      <style>{dynamicStyles}</style>
      <div
        id="background-container"
        className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none"
      >
        <div
          id="image-background"
          className="absolute top-0 left-0 w-full h-full bg-no-repeat z-10"
          style={{
            backgroundImage: pickedImage.url ? `url(${pickedImage.url})` : undefined,
            backgroundSize: pickedImage.size,
            backgroundPosition: pickedImage.position,
          }}
        />
        {showVideo && (
          <video
            id="video-background"
            className="absolute top-0 left-0 w-full h-full z-20"
            style={{
              objectFit: appearanceStyles.video.fit,
              objectPosition: appearanceStyles.video.position,
            }}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
          />
        )}
      </div>
    </>
  );
}
