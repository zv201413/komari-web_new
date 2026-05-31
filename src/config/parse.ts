import type { ConfigOptions } from "./default";

/**
 * 配置解析层 —— 把后端/默认配置里 stringly-typed 的复合字段，
 * 在“一处”规范化成强类型对象。新增字段或改格式时只改这里，
 * 不必在各消费方重复 split。
 */

const DEFAULT_BACKGROUND_ALIGNMENT = "cover,top";

/** CSS object-fit 合法取值（与 background-size 取值集合不同，需单独白名单收敛）。 */
export const OBJECT_FIT_VALUES = [
  "fill",
  "contain",
  "cover",
  "none",
  "scale-down",
] as const;
export type ObjectFit = (typeof OBJECT_FIT_VALUES)[number];

export interface Alignment {
  size: string;
  position: string | undefined;
}

/** 解析 "size,position" 形式的对齐字符串。 */
export function parseAlignment(
  value: string | undefined,
  fallback: string = DEFAULT_BACKGROUND_ALIGNMENT
): Alignment {
  const [size, position] = (value || fallback).split(",").map((s) => s.trim());
  return { size, position };
}

/** backgroundImages 数组元素：旧格式为纯 URL 字符串，新格式带 per-image 焦点/缩放。 */
export interface BackgroundImageEntry {
  url: string;
  /** background-size，如 "160%"；undefined 时回退全局 backgroundAlignment 的 size。 */
  size?: string;
  /** background-position，如 "72% 30%"；undefined 时回退全局 position。 */
  position?: string;
}

/**
 * 解析 backgroundImages（JSON 数组字符串）。元素可为：
 *  - 旧格式 string（纯 URL，可含 "light|dark"）；
 *  - 新格式 { url, size?, position? }。
 * 非法元素剔除；解析失败返回空数组。向后兼容旧配置。
 */
export function parseBackgroundImages(
  json: string | undefined
): BackgroundImageEntry[] {
  let arr: unknown;
  try {
    arr = JSON.parse(json || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.flatMap((it): BackgroundImageEntry[] => {
    if (typeof it === "string") return it ? [{ url: it }] : [];
    if (it && typeof it === "object" && typeof (it as { url?: unknown }).url === "string") {
      const o = it as { url: string; size?: unknown; position?: unknown };
      return [
        {
          url: o.url,
          size: typeof o.size === "string" && o.size ? o.size : undefined,
          position:
            typeof o.position === "string" && o.position ? o.position : undefined,
        },
      ];
    }
    return [];
  });
}

/**
 * 把对齐里的 size 收敛为合法的 object-fit。
 * 这样“图片合法但视频非法”（如 "100% 100%"）的取值不会让视频静默回退到 fill。
 */
export function toObjectFit(
  size: string,
  fallback: ObjectFit = "cover"
): ObjectFit {
  return (OBJECT_FIT_VALUES as readonly string[]).includes(size)
    ? (size as ObjectFit)
    : fallback;
}

export interface GlassColors {
  light: string;
  dark: string;
}

/** 解析 "light|dark" 形式的毛玻璃底色；只有一段时浅色/深色取同值。 */
export function parseGlassColors(value: string | undefined): GlassColors {
  const colors = (value || "").split("|").map((c) => c.trim());
  if (colors.length >= 2) {
    return { light: colors[0], dark: colors[1] };
  }
  return { light: colors[0] ?? "", dark: colors[0] ?? "" };
}

/** 解析 "key:bool,key:bool" 形式的状态卡显隐配置。 */
export function parseStatusCardsVisibility(
  value: string | undefined
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};
  (value || "").split(",").forEach((item) => {
    const [key, val] = item.split(":");
    if (!key) return;
    visibility[key] = val === "true";
  });
  return visibility;
}

export interface ResolvedAppearance {
  image: Alignment;
  video: { fit: ObjectFit; position: string | undefined };
  glass: GlassColors;
  blurPx: number;
}

/**
 * 外观聚合解析：背景所需的派生值一次性算好。
 * 视频对齐独立于图片（videoBackgroundAlignment 为空则回退到 backgroundAlignment）。
 */
export function resolveAppearance(config: ConfigOptions): ResolvedAppearance {
  const image = parseAlignment(config.backgroundAlignment);
  const videoAlign = parseAlignment(
    config.videoBackgroundAlignment || config.backgroundAlignment
  );
  return {
    image,
    video: { fit: toObjectFit(videoAlign.size), position: videoAlign.position },
    glass: parseGlassColors(config.blurBackgroundColor),
    blurPx: config.blurValue,
  };
}
