import { useState, useEffect, useRef, useMemo } from "react";
import type { NodeData } from "@/types/node";
import { useLocale } from "@/config/hooks";
import { Card } from "../ui/card";
import { GlobeIcon, ChevronDown, ChevronUp } from "lucide-react";

interface WorldMapProps {
  nodes: (NodeData & { stats?: any })[];
}

interface HoveredRegionInfo {
  id: string;
  count: number;
  name: string;
  x: number;
  y: number;
}

// Module-level cache for the SVG content to prevent refetching on every render
let cachedSvgContent: string | null = null;

// Helper to convert 2-letter ISO country code to flag emoji
const getFlagEmoji = (countryCode: string): string => {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return "🏳️";
  const codePoints = code
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return "🏳️";
  }
};

// Helper to convert flag emoji back to 2-letter ISO country code
const getCountryCodeFromEmoji = (emoji: string): string | null => {
  const chars = Array.from(emoji);
  if (chars.length !== 2) return null;
  
  const codePoint1 = chars[0].codePointAt(0)!;
  const codePoint2 = chars[1].codePointAt(0)!;
  
  const REGIONAL_INDICATOR_START = 0x1f1e6;
  const ASCII_ALPHA_START = 0x41;
  
  if (
    codePoint1 >= REGIONAL_INDICATOR_START && codePoint1 <= 0x1f1ff &&
    codePoint2 >= REGIONAL_INDICATOR_START && codePoint2 <= 0x1f1ff
  ) {
    return String.fromCodePoint(codePoint1 - REGIONAL_INDICATOR_START + ASCII_ALPHA_START) + 
           String.fromCodePoint(codePoint2 - REGIONAL_INDICATOR_START + ASCII_ALPHA_START);
  }
  return null;
};

export const WorldMap = ({ nodes }: WorldMapProps) => {
  const { t } = useLocale();
  const [svgContent, setSvgContent] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem("komari-world-map-collapsed");
    return saved === "true";
  });
  const [hoveredRegion, setHoveredRegion] = useState<HoveredRegionInfo | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Load world-map.svg
  useEffect(() => {
    if (isCollapsed) return;

    if (cachedSvgContent) {
      setSvgContent(cachedSvgContent);
      return;
    }

    fetch("/assets/world-map.svg")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.text();
      })
      .then((text) => {
        cachedSvgContent = text;
        setSvgContent(text);
      })
      .catch((err) => {
        console.error("Failed to fetch world map SVG:", err);
      });
  }, [isCollapsed]);

  // Compute region statistics
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((node) => {
      if (node.stats?.online && node.region) {
        let isoCode = node.region;
        const fromEmoji = getCountryCodeFromEmoji(node.region);
        if (fromEmoji) {
          isoCode = fromEmoji;
        } else if (node.region.length > 2 && node.region.includes(" ")) {
          // Fallback if backend was modified to store "emoji ISO"
          const parts = node.region.trim().split(" ");
          isoCode = parts[parts.length - 1];
        }
        const reg = isoCode.toLowerCase();
        counts[reg] = (counts[reg] || 0) + 1;
      }
    });
    return counts;
  }, [nodes]);

  const activeRegions = useMemo(() => {
    return Object.keys(regionCounts);
  }, [regionCounts]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("komari-world-map-collapsed", String(next));
      return next;
    });
  };

  // Event delegation to show tooltips when hovering active paths on the SVG map
  useEffect(() => {
    if (isCollapsed || !mapRef.current) return;
    const mapEl = mapRef.current;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      let current: HTMLElement | SVGElement | null = target;
      
      while (current && current !== mapEl) {
        const id = current.id?.toLowerCase();
        if (id && regionCounts[id] !== undefined) {
          setHoveredRegion({
            id,
            count: regionCounts[id],
            name: id.toUpperCase(),
            x: e.clientX,
            y: e.clientY,
          });
          return;
        }
        current = current.parentElement as HTMLElement | SVGElement;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      setHoveredRegion((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          x: e.clientX,
          y: e.clientY,
        };
      });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (!related || !mapEl.contains(related)) {
        setHoveredRegion(null);
      }
    };

    mapEl.addEventListener("mouseover", handleMouseOver);
    mapEl.addEventListener("mousemove", handleMouseMove);
    mapEl.addEventListener("mouseout", handleMouseOut);

    return () => {
      mapEl.removeEventListener("mouseover", handleMouseOver);
      mapEl.removeEventListener("mousemove", handleMouseMove);
      mapEl.removeEventListener("mouseout", handleMouseOut);
    };
  }, [isCollapsed, regionCounts]);

  // CSS variables style generator for coloring country paths in the SVG
  const mapStyle = useMemo(() => {
    if (isCollapsed) return "";
    return `
      #world-map {
        width: 100%;
        height: auto;
        max-height: 380px;
        display: block;
      }
      #world-map path, #world-map polygon, #world-map g {
        transition: fill 0.3s ease, opacity 0.3s ease;
        fill: var(--accent-3) !important;
        fill-opacity: 0.4 !important;
        stroke: var(--accent-6) !important;
        stroke-width: 0.5px !important;
        stroke-opacity: 0.6 !important;
      }
      ${activeRegions
        .map(
          (reg) => `
        #world-map #${reg}, 
        #world-map [id="${reg}"], 
        #world-map #${reg} path, 
        #world-map [id="${reg}"] path {
          fill: var(--accent-9) !important;
          fill-opacity: 1 !important;
          stroke: var(--accent-11) !important;
          stroke-width: 0.8px !important;
          stroke-opacity: 0.9 !important;
        }
        #world-map #${reg}:hover, 
        #world-map [id="${reg}"]:hover,
        #world-map #${reg}:hover path, 
        #world-map [id="${reg}"]:hover path {
          fill: var(--accent-11) !important;
          fill-opacity: 0.95 !important;
          cursor: pointer;
        }
      `
        )
        .join("\n")}
    `;
  }, [activeRegions, isCollapsed]);

  return (
    <Card className="purcarte-blur theme-card-style p-4 rounded-xl shadow-lg border border-(--accent-4)/30 transition-all duration-300">
      <div
        className="flex items-center justify-between cursor-pointer select-none text-primary"
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-2">
          <GlobeIcon className="size-5 text-(--accent-11)" />
          <span className="font-bold text-sm @md:text-base">
            {t("statsBar.region")}
            {activeRegions.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-(--accent-3) text-(--accent-11) border border-(--accent-4) font-mono">
                {activeRegions.length}
              </span>
            )}
          </span>
        </div>
        <div>
          {isCollapsed ? (
            <ChevronDown className="size-4 text-secondary-foreground" />
          ) : (
            <ChevronUp className="size-4 text-secondary-foreground" />
          )}
        </div>
      </div>

      {isCollapsed ? (
        activeRegions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 fade-in">
            {activeRegions.map((reg) => (
              <span
                key={reg}
                title={`${reg.toUpperCase()}: ${regionCounts[reg]} ${t("statsBar.currentOnline")}`}
                className="text-base px-2 py-0.5 rounded bg-(--accent-3)/40 border border-(--accent-4)/25 flex items-center gap-1 cursor-default hover:bg-(--accent-3) transition-colors"
              >
                <span>{getFlagEmoji(reg)}</span>
                <span className="text-xs font-mono text-secondary-foreground font-semibold">
                  {regionCounts[reg]}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-secondary-foreground mt-2 font-light">
            {t("statsBar.statsHidden")}
          </div>
        )
      ) : (
        <div className="relative mt-3 flex items-center justify-center min-h-[180px] @md:min-h-[260px] overflow-hidden fade-in">
          <style>{mapStyle}</style>
          {svgContent ? (
            <div
              id="world-map"
              ref={mapRef}
              className="w-full flex justify-center items-center"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="text-xs text-secondary-foreground animate-pulse">
              Loading map...
            </div>
          )}

          {hoveredRegion && (
            <div
              className="fixed z-50 pointer-events-none px-2 py-1 text-xs rounded-md bg-(--accent-1)/95 border border-(--accent-4) shadow-md text-primary font-medium flex items-center gap-1.5 backdrop-blur-sm"
              style={{ left: hoveredRegion.x + 12, top: hoveredRegion.y + 12 }}
            >
              <span>{getFlagEmoji(hoveredRegion.id)}</span>
              <span className="font-semibold">{hoveredRegion.name}</span>
              <span className="text-secondary-foreground">|</span>
              <span className="font-mono text-(--accent-11)">
                {hoveredRegion.count} 台在线
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
