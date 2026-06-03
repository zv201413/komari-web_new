import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import type { ConfigOptions } from "@/config/default";

interface SettingItemProps {
  item: any;
  editingConfig: Partial<ConfigOptions>;
  onConfigChange: (key: keyof ConfigOptions, value: any) => void;
}

const SettingItem = ({
  item,
  editingConfig,
  onConfigChange,
}: SettingItemProps) => {
  const defaultValue = item.default;
  const currentValue =
    editingConfig[item.key as keyof ConfigOptions] ?? defaultValue;
  const isModified = currentValue !== defaultValue;
  const [localValue, setLocalValue] = useState(currentValue);
  const [forceCustom, setForceCustom] = useState(false);

  useEffect(() => {
    setLocalValue(currentValue);
  }, [currentValue]);

  const handleBlur = () => {
    if (item.type === "number") {
      onConfigChange(item.key, Number(localValue));
    } else {
      onConfigChange(item.key, localValue);
    }
  };

  const renderInput = () => {
    switch (item.type) {
      case "number":
        return (
          <Input
            type="number"
            className="theme-card-style"
            value={localValue as number}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
          />
        );
      case "string":
        return (
          <Input
            type="text"
            className="theme-card-style"
            value={localValue as string}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
          />
        );
      case "switch":
        return (
          <Switch
            checked={localValue as boolean}
            onCheckedChange={(checked) => {
              setLocalValue(checked);
              onConfigChange(item.key, checked);
            }}
          />
        );
      case "select":
        return (
          <Select
            value={localValue as string}
            onValueChange={(value) => {
              setLocalValue(value);
              onConfigChange(item.key, value);
            }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.options.split(",").filter((o: string) => o !== "").map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "select-with-custom": {
        const optionsList = item.options.split(",").filter((o: string) => o !== "");
        const isCustomValue = forceCustom || !optionsList.includes(localValue as string);
        const [isUploading, setIsUploading] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setIsUploading(true);
          try {
            const res = await apiService.uploadImage(file);
            if (res.status === "success" && res.data?.url) {
              setLocalValue(res.data.url);
              onConfigChange(item.key, res.data.url);
              toast.success("上传成功并已自动应用");
            } else {
              toast.error("上传失败: " + (res.message || "未知错误"));
            }
          } catch (err: any) {
            toast.error("上传出错: " + err.message);
          } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        };

        return (
          <div className="flex flex-col gap-2">
            <Select
              value={isCustomValue ? "custom" : (localValue as string)}
              onValueChange={(value) => {
                if (value === "custom") {
                  // Enable custom mode but keep the current localValue intact
                  setForceCustom(true);
                } else {
                  setForceCustom(false);
                  setLocalValue(value);
                  onConfigChange(item.key, value);
                }
              }}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {optionsList.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option === "" ? "None / Empty" : option}
                  </SelectItem>
                ))}
                <SelectItem value="custom">自定义 URL (Custom)</SelectItem>
              </SelectContent>
            </Select>
            {isCustomValue && (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="text"
                  placeholder="在此输入自定义 URL..."
                  className="theme-card-style flex-1"
                  value={localValue as string}
                  onChange={(e) => setLocalValue(e.target.value)}
                  onBlur={handleBlur}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  title="直传文件"
                >
                  {isUploading ? <Loader2 className="animate-spin size-4" /> : <UploadCloud className="size-4" />}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*,.svg"
                  onChange={handleUpload}
                />
              </div>
            )}
          </div>
        );
      }
      case "multi-image": {
        const [isUploading, setIsUploading] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);
        
        let imgList: string[] = [];
        try {
          const parsed = JSON.parse((localValue as string) || "[]");
          if (Array.isArray(parsed)) imgList = parsed;
        } catch (e) {}

        const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(e.target.files || []);
          if (files.length === 0) return;
          setIsUploading(true);
          
          let currentList = [...imgList];
          let successCount = 0;
          let failCount = 0;

          try {
            for (const file of files) {
              try {
                const res = await apiService.uploadImage(file);
                if (res.status === "success" && res.data?.url) {
                  currentList.push(res.data.url);
                  const newJson = JSON.stringify(currentList);
                  setLocalValue(newJson);
                  onConfigChange(item.key, newJson);
                  successCount++;
                } else {
                  failCount++;
                }
              } catch (err) {
                failCount++;
              }
            }
            
            if (successCount > 0) toast.success(`成功上传 ${successCount} 张图片并已自动应用`);
            if (failCount > 0) toast.error(`${failCount} 张图片上传失败`);
          } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        };

        return (
          <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-zinc-800 rounded-md border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">背景画廊</span>
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? <Loader2 className="animate-spin mr-1 size-4" /> : <UploadCloud className="mr-1 size-4" />}
                批量上传
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*,video/*,.svg"
                onChange={handleUpload}
              />
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-2">
              {imgList.map((url, i) => (
                <div key={i} className="relative group aspect-video bg-gray-200 dark:bg-zinc-900 rounded overflow-hidden shadow-sm">
                  <img src={url} alt="bg" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除图片"
                    onClick={() => {
                      const newList = imgList.filter((_, idx) => idx !== i);
                      const newJson = JSON.stringify(newList);
                      setLocalValue(newJson);
                      onConfigChange(item.key, newJson);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imgList.length === 0 && (
                <div className="col-span-full text-sm text-gray-400 italic py-2 text-center">暂无图片，将降级使用单图模式</div>
              )}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  if (item.type === "title") {
    return <h3 className="text-lg font-semibold mt-4 mb-2">{item.name}</h3>;
  }

  if (item.type === "switch" || item.type === "select" || item.type === "select-with-custom") {
    return (
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-base font-bold">
            {item.name}
            {isModified && <span className="text-yellow-500 ml-2">*</span>}
          </span>
          {item.help && (
            <p className="text-sm text-gray-500 mt-1">{item.help}</p>
          )}
        </div>
        <div className="mt-2">{renderInput()}</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-bold">
          {item.name}
          {isModified && <span className="text-yellow-500 ml-2">*</span>}
        </span>
      </div>
      {item.help && <p className="text-sm text-gray-500 mt-1">{item.help}</p>}
      <div className="mt-2">{renderInput()}</div>
    </div>
  );
};

export default SettingItem;
