import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { X, RotateCcw } from "lucide-react";
import type { BackgroundImageEntry } from "@/config/parse";

interface BackgroundImageItemProps {
  entry: BackgroundImageEntry;
  onChange: (next: BackgroundImageEntry) => void;
  onDelete: () => void;
  /** 预览卡宽高比（宽/高）；如 16/9 横屏、9/16 竖屏。默认 16/9。 */
  aspectRatio?: number;
}

/** "light|dark" 取第一段做缩略图预览。 */
function getThumbUrl(url: string): string {
  return url.split("|")[0]?.trim() || url;
}

/** entry.position("72% 30%") → 焦点点显示坐标(%)；非 "x% y%" 时居中。 */
function parsePositionPercent(position?: string): { x: number; y: number } {
  const m = position
    ? position.trim().match(/^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/)
    : null;
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 50, y: 50 };
}

/** entry.size("160%") → 滑条数值；缺省/非百分比时为 100。 */
function sizeToPercent(size?: string): number {
  const m = size ? size.trim().match(/^(\d+(?:\.\d+)?)%$/) : null;
  return m ? Math.round(parseFloat(m[1])) : 100;
}

/**
 * 单张背景图编辑卡片：缩略图上拖焦点圆点设 background-position，
 * 下方缩放滑条设 background-size；缩略图本身用与运行时相同的 background-* 实时预览。
 * 未自定义时 size/position 为 undefined，运行时回退到全局 backgroundAlignment。
 */
export function BackgroundImageItem({
  entry,
  onChange,
  onDelete,
  aspectRatio = 16 / 9,
}: BackgroundImageItemProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const focus = parsePositionPercent(entry.position);
  const zoomPercent = sizeToPercent(entry.size);
  const customized = entry.size !== undefined || entry.position !== undefined;

  const setFocusFromEvent = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = previewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    onChange({ ...entry, position: `${Math.round(x)}% ${Math.round(y)}%` });
  };

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={previewRef}
        className="relative group bg-gray-200 dark:bg-zinc-900 rounded overflow-hidden cursor-crosshair touch-none"
        style={{
          aspectRatio: String(aspectRatio),
          backgroundImage: `url(${getThumbUrl(entry.url)})`,
          backgroundSize: entry.size ?? "cover",
          backgroundPosition: entry.position ?? "center top",
          backgroundRepeat: "no-repeat",
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          setFocusFromEvent(e);
        }}
        onPointerMove={(e) => {
          if (dragging) setFocusFromEvent(e);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
      >
        {/* 焦点圆点 */}
        <div
          className="absolute h-4 w-4 -ml-2 -mt-2 rounded-full border-2 border-white bg-blue-500/80 shadow pointer-events-none"
          style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
        />
        {/* 删除 */}
        <button
          type="button"
          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          title="删除图片"
          onClick={onDelete}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* 缩放滑条 + 重置 */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] text-gray-500">缩放</span>
        <input
          type="range"
          min={100}
          max={250}
          value={zoomPercent}
          onChange={(e) => onChange({ ...entry, size: `${e.target.value}%` })}
          className="h-1 flex-1 accent-blue-500"
        />
        <span className="w-10 text-right text-[11px] tabular-nums text-gray-500">
          {customized ? `${zoomPercent}%` : "全局"}
        </span>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
          title="重置为全局对齐"
          disabled={!customized}
          onClick={() => onChange({ url: entry.url })}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
