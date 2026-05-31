import React, { useEffect, useMemo, useState } from "react";
import { Flex, Heading, Callout, Separator, Button, DropdownMenu } from "@radix-ui/themes";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import {
  SettingCardSelect,
  SettingCardSwitch,
  SettingCardShortTextInput,
  SettingCardLongTextInput,
} from "@/components/admin/SettingCard";
import { toast } from "sonner";
import { UploadCloud, Loader2, X, ChevronDownIcon } from "lucide-react";
import { apiService } from "@/services/api";
import Loading from "@/components/loading";
import { useTranslation } from "react-i18next";
import { resolveI18nText, type I18nText } from "@/utils/i18nText";
import { useTheme } from "@/hooks/useTheme";

interface ThemeFieldBase {
  name?: I18nText; // 显示名（字符串或多语言字典）
  help?: I18nText; // 帮助文本（字符串或多语言字典）
  type: "title" | "switch" | "select" | "number" | "string" | "richtext" | "select-with-custom" | "multi-image";
  key?: string; // 对应设置键（title 无需）
  default?: any; // 默认值
  options?: string; // 仅 select 支持，逗号分隔
  required?: boolean;
}

interface ThemeConfigResponse {
  configuration?: {
    data?: ThemeFieldBase[];
  };
  [k: string]: any;
}

// 通用解析选项函数
const parseOptions = (optionsStr: string) => {
  const separator = optionsStr.includes("|") ? "|" : ",";
  return optionsStr.split(separator).map((s) => s.trim()).filter(Boolean).map((o) => {
    const parts = o.split(":");
    return { value: parts[0].trim(), label: parts[1] ? parts[1].trim() : parts[0].trim() };
  });
};

const ThemeManaged: React.FC = () => {
  const { publicInfo, refresh } = usePublicInfo();
  const theme = publicInfo?.theme;
  const themeSettings = publicInfo?.theme_settings || {}; // 当前值
  const { t, i18n } = useTranslation();
  const { appearance } = useTheme();

  const currentLanguage =
    i18n.resolvedLanguage ||
    i18n.language ||
    (typeof navigator !== "undefined" ? navigator.language : "");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<ThemeFieldBase[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [firstLoading, setFirstLoading] = useState(true);
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, boolean>>({});

  // 拉取主题配置
  useEffect(() => {
    async function load() {
      if (!theme) {
        setFields([]);
        setValues({});
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/themes/${theme}/komari-theme.json`, {
          cache: "no-cache",
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: ThemeConfigResponse = await resp.json();
        if (!data.configuration?.data) {
          setFields([]);
          setValues({});
          return;
        }
        const ds = data.configuration.data;
        setFields(ds);
        // 初始值：优先 publicInfo.theme_settings，其次 default
        const init: Record<string, any> = {};
        ds.forEach((f) => {
          if (f.type !== "title" && f.key) {
            init[f.key] =
              themeSettings && themeSettings[f.key] !== undefined
                ? themeSettings[f.key]
                : f.default;
          }
        });
        setValues(init);
      } catch (e: any) {
        setError(e.message || "加载主题配置失败");
      } finally {
        setLoading(false);
        setFirstLoading(false);
      }
    }
    load();
  }, [theme, themeSettings]);

  // 计算预览所需的背景图 URL 和对齐参数 - 改进版本，增加更多依赖确保及时更新
  const previewBgUrl = useMemo(() => {
    const bgImage = values["backgroundImage"];
    if (!bgImage) return "";
    const isDark = appearance === "dark";
    const urlList = bgImage.split("|").map((u: string) => u.trim());
    return urlList.length > 1 ? (isDark ? urlList[1] : urlList[0]) : urlList[0];
  }, [values, appearance]);

  const previewAlign = useMemo(() => {
    const alignStr = values["backgroundAlignment"] || values["backagroundAlignment"] || "cover,center";
    const parts = alignStr.split(",").map((s: string) => s.trim());
    return { size: parts[0] || "cover", position: parts[1] || "center" };
  }, [values]);

  const handleValueChange = (key: string, val: any) => {
    setValues((v) => ({ ...v, [key]: val }));
  };

  const payload = useMemo(() => {
    // 全量：对所有字段（非 title）输出当前值
    const obj: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "title" || !f.key) return;
      const current = values[f.key];
      // 直接使用当前值，undefined 时才用默认值
      if (current !== undefined) {
        obj[f.key] = current;
      } else if (f.default !== undefined) {
        obj[f.key] = f.default;
      } else {
        obj[f.key] = "";
      }
    });
    return obj;
  }, [fields, values]);

  const saveAll = async () => {
    if (!theme) return;
    console.log("保存前的 values:", values);
    console.log("保存前的 payload:", payload);
    setSaving(true);
    try {
      const resp = await fetch(
        `/api/admin/theme/settings?theme=${encodeURIComponent(theme)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({ message: "unknown" }));
        throw new Error(d.message || `HTTP ${resp.status}`);
      }
      toast.success("保存成功");
      // 刷新 publicInfo 以反映最新设置
      refresh();
    } catch (e: any) {
      toast.error(`保存失败: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  // 判断是否有背景图可预览
  const hasPreview = !firstLoading && !!previewBgUrl;

  return (
    <Flex direction="column" gap="4" className="p-2 md:p-4">
      <Flex justify="between" align="center">
        <Heading size="4">
          {theme
            ? t("theme.manage_with_name", {
                name: theme === "default" ? "" : theme,
              })
            : t("theme.manage")}
        </Heading>
        {fields.length > 0 && (
          <Button onClick={saveAll} disabled={saving}>
            {t("common.save")}
          </Button>
        )}
      </Flex>


      {error && (
        <Callout.Root color="red">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      {loading && firstLoading && <Loading />}
      {!loading && !error && fields.length === 0 && theme !== "default" && (
        <Callout.Root>
          <Callout.Text>{t("theme.no_config")}</Callout.Text>
        </Callout.Root>
      )}
      <Separator size="4" />
      <Flex direction="column" gap="3">
        {fields.map((f, idx) => {
          if (f.type === "title") {
            return (
              <Heading key={idx} size="3" className="mt-4">
                {resolveI18nText(f.name, currentLanguage) || "标题"}
              </Heading>
            );
          }
          if (!f.key) return null;
          const val = values[f.key];
          const title = resolveI18nText(f.name, currentLanguage);
          const description = resolveI18nText(f.help, currentLanguage);

          // 渲染字段的通用函数
          const renderField = () => {
          switch (f.type) {
            case "switch":
              return (
                <SettingCardSwitch
                  key={f.key}
                  title={title}
                  description={description}
                  defaultChecked={!!val}
                  onChange={(checked) => handleValueChange(f.key!, checked)}
                />
              );
            case "select": {
              const opts = parseOptions(f.options || "");
              return (
                <SettingCardSelect
                  key={f.key}
                  title={title}
                  description={description}
                  value={val}
                  options={opts}
                  OnSave={(v) => handleValueChange(f.key!, v)}
                  label={val || "选择"}
                />
              );
            }
            case "number":
              return (
                <SettingCardShortTextInput
                  key={f.key}
                  title={title}
                  description={description}
                  type="number"
                  showSaveButton={false}
                  value={val !== undefined ? String(val) : ""}
                  onChange={(e) =>
                    handleValueChange(
                      f.key!,
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                />
              );
            case "richtext":
              return (
                <SettingCardLongTextInput
                  key={f.key}
                  title={title}
                  description={description}
                  defaultValue={val !== undefined ? String(val) : ""}
                  showSaveButton={false}
                  onChange={(e) => handleValueChange(f.key!, e.target.value)}
                />
              );
            case "select-with-custom": {
              const fieldKey = f.key!;
              const isUploading = uploadingKeys[fieldKey] || false;
              const opts = parseOptions(f.options || "");
              return (
                <div key={fieldKey} className="flex items-start gap-2">
                  <div className="flex-1">
                    <SettingCardShortTextInput
                      title={title}
                      description={description}
                      value={val !== undefined ? String(val) : ""}
                      required={f.required}
                      showSaveButton={false}
                      onChange={(e) => handleValueChange(fieldKey, e.target.value)}
                    />
                  </div>
                  <div className="mt-5 shrink-0 flex gap-1">
                    {opts.length > 0 && (
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger disabled={isUploading}>
                          <Button variant="soft" size="1">
                            <ChevronDownIcon size={16} />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                          {opts.map((opt) => (
                            <DropdownMenu.Item key={opt.value} onSelect={() => handleValueChange(fieldKey, opt.value)}>
                              {opt.label || opt.value}
                            </DropdownMenu.Item>
                          ))}
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    )}
                    <Button
                      variant="soft"
                      size="1"
                      disabled={isUploading}
                      onClick={() => document.getElementById(`upload-${fieldKey}`)?.click()}
                    >
                      {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                    </Button>
                    <input
                      type="file"
                      id={`upload-${fieldKey}`}
                      className="hidden"
                      accept="image/*,video/*,.svg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingKeys((prev) => ({ ...prev, [fieldKey]: true }));
                        try {
                          const res = await apiService.uploadImage(file);
                          if (res.status === "success" && res.data?.url) {
                            handleValueChange(fieldKey, res.data.url);
                            toast.success("上传成功并已自动应用");
                          } else {
                            toast.error("上传失败: " + (res.message || "未知错误"));
                          }
                        } catch (err: any) {
                          toast.error("上传出错: " + err.message);
                        } finally {
                          setUploadingKeys((prev) => ({ ...prev, [fieldKey]: false }));
                          const el = document.getElementById(`upload-${fieldKey}`) as HTMLInputElement;
                          if (el) el.value = "";
                        }
                      }}
                    />
                  </div>
                </div>
              );
            }
            case "multi-image": {
              const fieldKey = f.key!;
              const isUploading = uploadingKeys[fieldKey] || false;
              let imgList: string[] = [];
              try {
                const parsed = JSON.parse(val || "[]");
                if (Array.isArray(parsed)) imgList = parsed;
              } catch (e) {}

              return (
                <div key={fieldKey} className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-zinc-800 rounded-md border border-gray-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{title}</div>
                      <div className="text-sm text-gray-500">{description}</div>
                    </div>
                    <Button
                      variant="soft"
                      size="1"
                      disabled={isUploading}
                      onClick={() => document.getElementById(`upload-${fieldKey}`)?.click()}
                    >
                      {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud className="mr-1 h-4 w-4" />}
                      批量上传
                    </Button>
                    <input
                      type="file"
                      id={`upload-${fieldKey}`}
                      className="hidden"
                      multiple
                      accept="image/*,video/*,.svg"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        setUploadingKeys((prev) => ({ ...prev, [fieldKey]: true }));
                        
                        let currentList = [...imgList];
                        let successCount = 0;
                        let failCount = 0;

                        try {
                          for (const file of files) {
                            try {
                              const res = await apiService.uploadImage(file);
                              if (res.status === "success" && res.data?.url) {
                                currentList.push(res.data.url);
                                // Update iteratively so UI reflects progress
                                handleValueChange(fieldKey, JSON.stringify(currentList));
                                successCount++;
                              } else {
                                failCount++;
                              }
                            } catch (err) {
                              failCount++;
                            }
                          }
                          
                          if (successCount > 0) {
                            toast.success(`成功上传 ${successCount} 张图片`);
                          }
                          if (failCount > 0) {
                            toast.error(`${failCount} 张图片上传失败`);
                          }
                        } finally {
                          setUploadingKeys((prev) => ({ ...prev, [fieldKey]: false }));
                          const el = document.getElementById(`upload-${fieldKey}`) as HTMLInputElement;
                          if (el) el.value = "";
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-2">
                    {imgList.map((url, i) => (
                      <div key={i} className="relative group aspect-video bg-gray-200 dark:bg-zinc-900 rounded overflow-hidden">
                        <img src={url} alt="bg" className="w-full h-full object-cover" />
                        <button
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="删除图片"
                          onClick={() => {
                            const newList = imgList.filter((_, idx) => idx !== i);
                            handleValueChange(fieldKey, JSON.stringify(newList));
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {imgList.length === 0 && (
                      <div className="col-span-full text-sm text-gray-400 italic">暂无图片</div>
                    )}
                  </div>
                </div>
              );
            }
            case "string":
            default:
              return (
                <SettingCardShortTextInput
                  key={f.key}
                  title={title}
                  description={description}
                  value={val !== undefined ? String(val) : ""}
                  required={f.required}
                  showSaveButton={false}
                  onChange={(e) => handleValueChange(f.key!, e.target.value)}
                />
              );
          }
          };

// 在 backgroundAlignment 字段后面追加实时预览面板
          if (f.key === "backgroundAlignment" || f.key === "backagroundAlignment") {
            return (
              <React.Fragment key={f.key}>
                {renderField()}
                {hasPreview && (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "220px",
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "1px solid var(--accent-6)",
                      backgroundImage: `url(${previewBgUrl})`,
                      backgroundSize: previewAlign.size,
                      backgroundPosition: previewAlign.position,
                      backgroundRepeat: "no-repeat",
                      backgroundColor: "var(--accent-3)",
                      transition: "background-size 0.3s ease, background-position 0.3s ease",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "8px 14px",
                        background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                        color: "white",
                        fontSize: "13px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>🖼️ 背景预览</span>
                      <span style={{ opacity: 0.8, fontSize: "12px" }}>
                        {previewAlign.size}, {previewAlign.position}
                      </span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          }

          return renderField();
        })}
      </Flex>
      {fields.length > 0 && (
        <Flex>
          <Button onClick={saveAll} disabled={saving}>
            {t("common.save")}
          </Button>
        </Flex>
      )}
    </Flex>
  );
};

export default ThemeManaged;
