import { type ReactNode, useCallback, useMemo, useEffect, useState } from "react";
import { useAppConfig } from "@/config/hooks";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/hooks/useTheme";

export function DynamicContent({ children }: { children: ReactNode }) {
  const config = useAppConfig();
  const isMobile = useIsMobile();
  const { appearance } = useTheme();
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkPortrait = () => setIsPortrait(window.innerHeight > window.innerWidth);
    checkPortrait();
    window.addEventListener("resize", checkPortrait);
    return () => window.removeEventListener("resize", checkPortrait);
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

  const imageUrl = useMemo(() => {
    if (!config) return "";
    
    const isMob = isMobile || isPortrait;
    let targetMulti = isMob && config.backgroundImagesMobile && config.backgroundImagesMobile !== "[]" 
      ? config.backgroundImagesMobile 
      : config.backgroundImages;
    let targetSingle = isMob && config.backgroundImageMobile 
      ? config.backgroundImageMobile 
      : config.backgroundImage;

    const getRandomImage = (jsonStr: string, fallbackUrl: string) => {
      try {
        const arr = JSON.parse(jsonStr || "[]");
        if (Array.isArray(arr) && arr.length > 0) {
          const randomIndex = Math.floor(Math.random() * arr.length);
          return arr[randomIndex];
        }
      } catch (e) {}
      return fallbackUrl;
    };

    const pickedUrlStr = getRandomImage(targetMulti, targetSingle);
    return getUrlFromConfig(pickedUrlStr);
  }, [config, isMobile, isPortrait, getUrlFromConfig]);

  const videoUrl = useMemo(() => {
    if (!config || !config.enableVideoBackground) return "";
    const { videoBackgroundUrl, videoBackgroundUrlMobile } = config;
    return isMobile && videoBackgroundUrlMobile
      ? getUrlFromConfig(videoBackgroundUrlMobile)
      : getUrlFromConfig(videoBackgroundUrl);
  }, [config, isMobile, getUrlFromConfig]);

  const dynamicStyles = useMemo(() => {
    if (!config) return "";
    const { mainWidth, blurValue, blurBackgroundColor } = config;
    const styles: string[] = [];

    styles.push(`--main-width: ${mainWidth}vw;`);
    styles.push(`--body-background-url: url(${imageUrl});`);
    styles.push(`--purcarte-blur: ${blurValue}px;`);

    const colors = blurBackgroundColor.split("|").map((color) => color.trim());
    if (colors.length >= 2) {
      styles.push(`--card-light: ${colors[0]};`);
      styles.push(`--card-dark: ${colors[1]};`);
    } else if (colors.length === 1) {
      styles.push(`--card-light: ${colors[0]};`);
      styles.push(`--card-dark: ${colors[0]};`);
    }

    return `:root { ${styles.join(" ")} }`;
  }, [config, imageUrl]);

  useEffect(() => {
    const imageBackground = document.getElementById("image-background");
    const videoBackground = document.getElementById(
      "video-background"
    ) as HTMLVideoElement;
    const [size, position] = config.backgroundAlignment
      .split(",")
      .map((s) => s.trim());

    if (imageBackground) {
      imageBackground.style.backgroundImage = `url(${imageUrl})`;
      imageBackground.style.backgroundSize = size;
      imageBackground.style.backgroundPosition = position;
    }

    if (videoBackground) {
      if (config.enableVideoBackground && videoUrl) {
        videoBackground.src = videoUrl;
        videoBackground.style.objectFit = size;
        videoBackground.style.objectPosition = position;
        videoBackground.style.display = "block";
      } else {
        videoBackground.style.display = "none";
      }
    }
  }, [
    imageUrl,
    videoUrl,
    config.backgroundAlignment,
    config.enableVideoBackground,
  ]);

  return (
    <>
      <style>{dynamicStyles}</style>
      <div
        id="background-container"
        className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none"
      >
        <div
          id="image-background"
          className="absolute top-0 left-0 w-full h-full bg-cover bg-no-repeat z-10"
        />
        <video
          id="video-background"
          className="absolute top-0 left-0 w-full h-full object-cover z-20"
          style={{ display: "none" }}
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
      <div className="fade-in relative z-30">{children}</div>
    </>
  );
}
