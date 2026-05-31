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
