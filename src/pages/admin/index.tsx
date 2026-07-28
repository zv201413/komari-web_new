import {
  quotePowerShellArg,
  quoteShellArg,
  quoteShellArgs,
} from "@/utils/shellQuote";
import React, { useEffect, useState } from "react";
import { formatDate } from "@/utils/timezone";
import {
  NodeDetailsProvider,
  useNodeDetails,
  type NodeDetail,
} from "@/contexts/NodeDetailsContext";
import {
  Flex,
  TextField,
  Button,
  Checkbox,
  Text,
  Dialog,
  AlertDialog,
  IconButton,
  TextArea,
  SegmentedControl,
  Switch,
  Callout,
} from "@radix-ui/themes";
import {
  CircleDollarSign,
  Copy,
  CornerRightUp,
  Download,
  MenuIcon,
  Pencil,
  Plus,
  Radar,
  Settings,
  Terminal,
  Trash2Icon,
  ClipboardCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import Flag from "@/components/Flag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { formatBytes, stringToBytes } from "@/utils/unitHelper";
import PriceTags from "@/components/PriceTags";
import Loading from "@/components/loading";
import Tips from "@/components/ui/tips";
import {
  SettingCardCollapse,
  SettingCardSelect,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { useSettings } from "@/lib/api";
import { SelectOrInput } from "@/components/ui/select-or-input";


const NodeDetailsPage = () => {
  return (
    <NodeDetailsProvider>
      <Layout />
    </NodeDetailsProvider>
  );
};

const Layout = () => {
  const { nodeDetail, isLoading, error, refresh } = useNodeDetails();
  const { settings, loading: settingsLoading } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const filteredNodes = Array.isArray(nodeDetail)
    ? nodeDetail
        .filter((node) =>
          node.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.weight - b.weight)
    : [];

  useEffect(() => {
    const interval = setInterval(() => { refresh() }, 5000);
    return () => clearInterval(interval);
  }, [nodeDetail]);

  if (isLoading) return <Loading text="" />;
  if (error) return <div>{error}</div>;

  const isEmpty = Array.isArray(nodeDetail) && nodeDetail.length === 0;

  return (
    <Flex direction="column" gap="4" p="4">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedNodes={selectedNodes}
        settings={settings}
        settingsLoading={settingsLoading}
      />

      {isEmpty ? (
        <EmptyNodesGuide />
      ) : (
        <NodeTable
          nodes={filteredNodes}
          selectedNodes={selectedNodes}
          setSelectedNodes={setSelectedNodes}
          settings={settings}
        />
      )}
    </Flex>
  );
};

const EmptyNodesGuide = () => {
  const { t } = useTranslation();
  return (
    <Flex
      direction="column"
      align="end"
      justify="start"
      style={{ minHeight: "60vh" }}
      pr="2"
      pt="1"
    >
      {/* 回转箭头指向右上角的“添加节点”按钮 */}
      <CornerRightUp
        size={72}
        strokeWidth={1.25}
        className="text-[var(--accent-9)] animate-bounce"
        style={{ marginRight: "1.5rem" }}
      />
      <Flex direction="column" align="end" gap="1" mt="2" mr="2">
        <Text size="4" weight="bold">
          {t("admin.nodeTable.emptyGuide.title", "还没有任何服务器")}
        </Text>
        <Text size="2" color="gray" align="right" style={{ maxWidth: "20rem" }}>
          {t(
            "admin.nodeTable.emptyGuide.description",
            "点击右上角的“添加节点”开始，或开启自动发现批量接入服务器。"
          )}
        </Text>
      </Flex>
    </Flex>
  );
};

type AutoDiscoveryInstallOptions = {
  disableWebSsh: boolean;
  disableAutoUpdate: boolean;
  ignoreUnsafeCert: boolean;
  memoryIncludeCache: boolean;
  getIpAddrFromNic: boolean;
  enableGpu: boolean;
  ghproxy: string;
  dir: string;
  serviceName: string;
  includeNics: string;
  excludeNics: string;
  includeMountpoints: string;
  interval: string;
  monthRotate: string;
};

const AutoDiscoverySection = ({
  settings,
  loading,
}: {
  settings: any;
  loading?: boolean;
}) => {
  const { t } = useTranslation();
  const adKey: string = settings?.auto_discovery_key || "";
  const enabled = Boolean(adKey);

  const [selectedPlatform, setSelectedPlatform] =
    React.useState<Platform>("linux");
  const [showOptions, setShowOptions] = React.useState(false);
  const [installOptions, setInstallOptions] =
    React.useState<AutoDiscoveryInstallOptions>({
      disableWebSsh: false,
      disableAutoUpdate: false,
      ignoreUnsafeCert: false,
      memoryIncludeCache: false,
      getIpAddrFromNic: false,
      enableGpu: false,
      ghproxy: "",
      dir: "",
      serviceName: "",
      includeNics: "",
      excludeNics: "",
      includeMountpoints: "",
      interval: "",
      monthRotate: "",
    });

  const [enableGhproxy, setEnableGhproxy] = React.useState(false);
  const [enableCustomDir, setEnableCustomDir] = React.useState(false);
  const [enableCustomServiceName, setEnableCustomServiceName] =
    React.useState(false);
  const [enableIncludeNics, setEnableIncludeNics] = React.useState(false);
  const [enableExcludeNics, setEnableExcludeNics] = React.useState(false);
  const [enableIncludeMountpoints, setEnableIncludeMountpoints] =
    React.useState(false);
  const [enableInterval, setEnableInterval] = React.useState(false);
  const [enableMonthRotate, setEnableMonthRotate] = React.useState(false);

  const generateCommand = () => {
    const host = (function () {
      if (!settings?.script_domain) {
        return window.location.origin;
      }
      if (settings.script_domain.startsWith("http")) {
        return settings.script_domain.replace(/\/+$/, "");
      }
      return `http://${settings.script_domain.replace(/\/+$/, "")}`;
    })();
    const args: string[] = ["-e", host, "--auto-discovery", adKey];
    if (installOptions.disableWebSsh) {
      args.push("--disable-web-ssh");
    }
    if (installOptions.disableAutoUpdate) {
      args.push("--disable-auto-update");
    }
    if (installOptions.ignoreUnsafeCert) {
      args.push("--ignore-unsafe-cert");
    }
    if (installOptions.memoryIncludeCache) {
      args.push("--memory-include-cache");
    }
    if (installOptions.getIpAddrFromNic) {
      args.push("--get-ip-addr-from-nic");
    }
    if (installOptions.enableGpu) {
      args.push("--gpu");
    }
    const ghproxy = installOptions.ghproxy.trim();
    if (enableGhproxy && ghproxy) {
      const finalUrl = (
        ghproxy.startsWith("http") ? ghproxy : `http://${ghproxy}`
      ).replace(/\/+$/, "");
      args.push(`--install-ghproxy`);
      args.push(finalUrl);
    }
    const installDir = installOptions.dir.trim();
    if (enableCustomDir && installDir) {
      args.push(`--install-dir`);
      args.push(installDir);
    }
    const serviceName = installOptions.serviceName.trim();
    if (enableCustomServiceName && serviceName) {
      args.push(`--install-service-name`);
      args.push(serviceName);
    }
    const includeNics = installOptions.includeNics.trim();
    if (enableIncludeNics && includeNics) {
      args.push(`--include-nics`);
      args.push(includeNics);
    }
    const excludeNics = installOptions.excludeNics.trim();
    if (enableExcludeNics && excludeNics) {
      args.push(`--exclude-nics`);
      args.push(excludeNics);
    }
    const includeMountpoints = installOptions.includeMountpoints.trim();
    if (enableIncludeMountpoints && includeMountpoints) {
      args.push(`--include-mountpoint`);
      args.push(includeMountpoints);
    }
    if (enableInterval) {
      const intervalVal = Number.parseFloat(
        (installOptions.interval || "").trim()
      );
      args.push("-i");
      args.push(
        Number.isFinite(intervalVal) && intervalVal >= 1
          ? String(intervalVal)
          : "1"
      );
    }
    if (enableMonthRotate) {
      const rotateVal = (installOptions.monthRotate || "").trim() || "1";
      args.push(`--month-rotate`);
      args.push(rotateVal);
    }

    let scriptFile = "install.sh";
    if (selectedPlatform === "windows") {
      scriptFile = "install.ps1";
    }
    let scriptUrl = `https://raw.githubusercontent.com/zv201413/komari-agent_new/refs/heads/main/${scriptFile}`;
    if (enableGhproxy && ghproxy) {
      scriptUrl = scriptUrl.slice(8); // 去掉 https://
      if (ghproxy.endsWith("/")) {
        scriptUrl = `${ghproxy}${scriptUrl}`;
      } else {
        scriptUrl = `${ghproxy}/${scriptUrl}`;
      }
      if (!scriptUrl.startsWith("http")) {
        scriptUrl = `http://${scriptUrl}`;
      }
    }

    let finalCommand = "";
    switch (selectedPlatform) {
      case "linux":
        finalCommand =
          `wget -qO- ${quoteShellArg(scriptUrl)} | sudo bash -s -- ` +
          quoteShellArgs(args);
        break;
      case "windows":
        finalCommand =
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ` +
          `"iwr ${quotePowerShellArg(scriptUrl)}` +
          ` -UseBasicParsing -OutFile 'install.ps1'; &` +
          ` '.\\install.ps1'`;
        args.forEach((arg) => {
          finalCommand += ` ${quotePowerShellArg(arg)}`;
        });
        finalCommand += `"`;
        break;
      case "macos":
        finalCommand =
          `zsh <(curl -sL ${quoteShellArg(scriptUrl)}) ` +
          quoteShellArgs(args);
        break;
      case "docker": {
        // Docker 运行时不支持安装脚本专用参数，剔除它们及其取值
        const installOnlyFlags = [
          "--install-ghproxy",
          "--install-dir",
          "--install-service-name",
        ];
        const dockerArgs: string[] = [];
        for (let i = 0; i < args.length; i++) {
          if (installOnlyFlags.includes(args[i])) {
            i++; // 跳过该标志的取值
            continue;
          }
          dockerArgs.push(args[i]);
        }
        // 自动发现会在 /app/auto-discovery.json 写入注册得到的 uuid/token，
        // 通过 bind mount 持久化该文件，容器更新重建后复用同一身份，避免重复注册。
        // 注意：文件挂载要求宿主机上文件已存在，否则 Docker 会将其创建为目录。
        finalCommand =
          `touch .komari-auto-discovery.json && ` +
          `docker run -d --name komari-agent --restart=always ` +
          `-v .komari-auto-discovery.json:/app/auto-discovery.json ` +
          `ghcr.io/komari-monitor/komari-agent:latest ` +
          quoteShellArgs(dockerArgs);
        break;
      }
    }
    return finalCommand;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copy_success", "已复制到剪贴板"));
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" mt="4" py="4">
        <Loading text="" />
      </Flex>
    );
  }

  if (!enabled) {
    return (
      <Callout.Root color="blue" mt="4" size="1">
        <Callout.Icon>
          <Radar size={16} />
        </Callout.Icon>
        <Callout.Text>
          <Flex direction="column" gap="2" align="start">
            <Text weight="bold">
              {t("admin.nodeTable.autoDiscovery.tryIt", "试试自动发现")}
            </Text>
            <Text size="2">
              {t(
                "admin.nodeTable.autoDiscovery.disabledDescription",
                "开启自动发现后，无需逐台手动添加节点。只要在目标服务器上运行一条命令，Agent 就会携带密钥自动注册并上线，非常适合批量部署多台服务器。"
              )}
            </Text>
            <Link to="/admin/settings/general">
              <Button variant="soft" size="1">
                <Settings size={14} />
                {t(
                  "admin.nodeTable.autoDiscovery.goToSettings",
                  "前往“常规设置”开启自动发现"
                )}
              </Button>
            </Link>
          </Flex>
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Flex direction="column" gap="3" mt="4">
      <Flex direction="column" gap="1">
        <Flex gap="2" align="center">
          <Radar size={16} />
          <Text weight="bold">
            {t("admin.nodeTable.autoDiscovery.title", "自动发现")}
          </Text>
        </Flex>
        <Text size="2" color="gray">
          {t(
            "admin.nodeTable.autoDiscovery.enabledDescription",
            "在目标服务器上运行下面的命令，Agent 将自动注册并上线，无需手动添加节点。"
          )}
        </Text>
      </Flex>

      <SegmentedControl.Root
        value={selectedPlatform}
        onValueChange={(value) => setSelectedPlatform(value as Platform)}
      >
        <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
        <SegmentedControl.Item value="windows">Windows</SegmentedControl.Item>
        <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
        <SegmentedControl.Item value="docker">Docker</SegmentedControl.Item>
      </SegmentedControl.Root>

      <Flex gap="2" align="center">
        <Checkbox
          checked={showOptions}
          onCheckedChange={(checked) => setShowOptions(Boolean(checked))}
        />
        <label
          className="text-sm font-bold cursor-pointer"
          onClick={() => setShowOptions((prev) => !prev)}
        >
          {t("admin.nodeTable.installOptions", "安装选项")}
        </label>
      </Flex>

      {showOptions && (
        <Flex direction="column" gap="2">
          <div className="grid grid-cols-2 gap-2">
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.disableWebSsh}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    disableWebSsh: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    disableWebSsh: !prev.disableWebSsh,
                  }))
                }
              >
                {t("admin.nodeTable.disableWebSsh")}
              </label>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.disableAutoUpdate}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    disableAutoUpdate: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    disableAutoUpdate: !prev.disableAutoUpdate,
                  }))
                }
              >
                {t("admin.nodeTable.disableAutoUpdate", "禁用自动更新")}
              </label>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.ignoreUnsafeCert}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    ignoreUnsafeCert: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    ignoreUnsafeCert: !prev.ignoreUnsafeCert,
                  }))
                }
              >
                {t("admin.nodeTable.ignoreUnsafeCert", "忽略不安全证书")}
              </label>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.memoryIncludeCache}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    memoryIncludeCache: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    memoryIncludeCache: !prev.memoryIncludeCache,
                  }))
                }
              >
                {t("admin.nodeTable.memoryModeAvailable", "监测可用内存")}
              </label>
              <Tips size="14">
                {t("admin.nodeTable.memoryModeAvailable_tip")}
              </Tips>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.getIpAddrFromNic}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    getIpAddrFromNic: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    getIpAddrFromNic: !prev.getIpAddrFromNic,
                  }))
                }
              >
                {t("admin.nodeTable.getIpAddrFromNic", "从网卡获取 IP 地址")}
              </label>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.enableGpu}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    enableGpu: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    enableGpu: !prev.enableGpu,
                  }))
                }
              >
                {t("admin.nodeTable.enableGpuMonitoring", "启用详细 GPU 监控")}
              </label>
            </Flex>
          </div>

          <Flex direction="column" gap="2">
            <Flex gap="2" align="center">
              <Checkbox
                checked={enableGhproxy}
                onCheckedChange={(checked) => {
                  setEnableGhproxy(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, ghproxy: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableGhproxy(!enableGhproxy);
                  if (enableGhproxy) {
                    setInstallOptions((prev) => ({ ...prev, ghproxy: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.ghproxy", "GitHub 代理")}
              </label>
            </Flex>
            {enableGhproxy && (
              <TextField.Root
                placeholder="https://ghfast.top/"
                value={installOptions.ghproxy}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    ghproxy: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableCustomDir}
                onCheckedChange={(checked) => {
                  setEnableCustomDir(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, dir: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableCustomDir(!enableCustomDir);
                  if (enableCustomDir) {
                    setInstallOptions((prev) => ({ ...prev, dir: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.install_dir", "安装目录")}
              </label>
            </Flex>
            {enableCustomDir && (
              <TextField.Root
                placeholder={t(
                  "admin.nodeTable.install_dir_placeholder",
                  "安装目录，为空则使用默认目录(/opt/komari-agent)"
                )}
                value={installOptions.dir}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    dir: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableCustomServiceName}
                onCheckedChange={(checked) => {
                  setEnableCustomServiceName(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, serviceName: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableCustomServiceName(!enableCustomServiceName);
                  if (enableCustomServiceName) {
                    setInstallOptions((prev) => ({ ...prev, serviceName: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.serviceName", "服务名称")}
              </label>
            </Flex>
            {enableCustomServiceName && (
              <TextField.Root
                placeholder={t(
                  "admin.nodeTable.serviceName_placeholder",
                  "服务名称，为空则使用默认名称(komari-agent)"
                )}
                value={installOptions.serviceName}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    serviceName: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableIncludeNics}
                onCheckedChange={(checked) => {
                  setEnableIncludeNics(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, includeNics: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableIncludeNics(!enableIncludeNics);
                  if (enableIncludeNics) {
                    setInstallOptions((prev) => ({ ...prev, includeNics: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.includeNics", "只监测特定网卡")}
              </label>
            </Flex>
            {enableIncludeNics && (
              <TextField.Root
                placeholder="eth0,eth1"
                value={installOptions.includeNics}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    includeNics: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableExcludeNics}
                onCheckedChange={(checked) => {
                  setEnableExcludeNics(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, excludeNics: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableExcludeNics(!enableExcludeNics);
                  if (enableExcludeNics) {
                    setInstallOptions((prev) => ({ ...prev, excludeNics: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.excludeNics", "排除特定网卡")}
              </label>
            </Flex>
            {enableExcludeNics && (
              <TextField.Root
                placeholder="lo"
                value={installOptions.excludeNics}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    excludeNics: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableIncludeMountpoints}
                onCheckedChange={(checked) => {
                  setEnableIncludeMountpoints(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeMountpoints: "",
                    }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableIncludeMountpoints(!enableIncludeMountpoints);
                  if (enableIncludeMountpoints) {
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeMountpoints: "",
                    }));
                  }
                }}
              >
                {t("admin.nodeTable.includeMountpoints", "只监测特定挂载点")}
              </label>
            </Flex>
            {enableIncludeMountpoints && (
              <TextField.Root
                placeholder="/;/home;/var"
                value={installOptions.includeMountpoints}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    includeMountpoints: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableInterval}
                onCheckedChange={(checked) => {
                  const en = Boolean(checked);
                  setEnableInterval(en);
                  setInstallOptions((prev) => ({
                    ...prev,
                    interval: en
                      ? prev.interval?.trim()
                        ? prev.interval
                        : "1"
                      : "",
                  }));
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  const willEnable = !enableInterval;
                  setEnableInterval(willEnable);
                  setInstallOptions((prev) => ({
                    ...prev,
                    interval: willEnable
                      ? prev.interval?.trim()
                        ? prev.interval
                        : "1"
                      : "",
                  }));
                }}
              >
                {t("admin.nodeTable.interval", "采集间隔(秒)")}
              </label>
            </Flex>
            {enableInterval && (
              <TextField.Root
                placeholder="1"
                type="number"
                min="1"
                step="0.1"
                value={installOptions.interval}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    interval: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableMonthRotate}
                onCheckedChange={(checked) => {
                  const en = Boolean(checked);
                  setEnableMonthRotate(en);
                  setInstallOptions((prev) => ({
                    ...prev,
                    monthRotate: en
                      ? prev.monthRotate?.trim()
                        ? prev.monthRotate
                        : "1"
                      : "",
                  }));
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  const willEnable = !enableMonthRotate;
                  setEnableMonthRotate(willEnable);
                  setInstallOptions((prev) => ({
                    ...prev,
                    monthRotate: willEnable
                      ? prev.monthRotate?.trim()
                        ? prev.monthRotate
                        : "1"
                      : "",
                  }));
                }}
              >
                {t("admin.nodeTable.monthRotate", "网络统计月重置")}
              </label>
            </Flex>
            {enableMonthRotate && (
              <TextField.Root
                placeholder="1"
                type="number"
                min="1"
                max="31"
                value={installOptions.monthRotate}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    monthRotate: e.target.value,
                  }))
                }
              />
            )}
          </Flex>
        </Flex>
      )}

      <Flex direction="column" gap="2">
        <label className="text-sm font-bold">
          {t("admin.nodeTable.generatedCommand", "指令")}
        </label>
        <TextArea
          disabled
          className="w-full"
          style={{ minHeight: "80px" }}
          value={generateCommand()}
        />
      </Flex>
      <Button
        style={{ width: "100%" }}
        onClick={() => copyToClipboard(generateCommand())}
      >
        <Copy size={16} />
        {t("copy")}
      </Button>
    </Flex>
  );
};

const Header = ({
  searchTerm,
  setSearchTerm,
  selectedNodes,
  settings,
  settingsLoading,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedNodes: string[];
  settings: any;
  settingsLoading: boolean;
}) => {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleAddNode = async (name: string | undefined) => {
    setDialogOpen(true);
    setLoading(true);
    try {
      await fetch("/api/admin/client/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "" }),
      });
      refresh();
    } catch (error) {
      toast.error(
        `${t("common.error", "Error")}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };
  return (
    <Flex justify="between" align="center" gap="4" wrap="wrap">
      <Flex gap="2" align="center">
        <Text size="5" weight="bold">
          {t("admin.nodeTable.nodeList")}
        </Text>
        {selectedNodes.length > 0 && (
          <Text size="2">({selectedNodes.length} selected)</Text>
        )}
      </Flex>
      <Flex gap="2">
        <TextField.Root
          placeholder={t("admin.nodeTable.searchByName")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={16} />
              {t("admin.nodeTable.addNode")}
            </Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Title>{t("admin.nodeTable.addNode")}</Dialog.Title>
            <TextField.Root
              ref={inputRef}
              placeholder={t("admin.nodeTable.nameOptional")}
            />
            <Flex justify="end" gap="2" mt="4">
              <Button
                onClick={() => handleAddNode(inputRef.current?.value)}
                disabled={loading}
              >
                {t("admin.nodeTable.addNode")}
              </Button>
            </Flex>
            <AutoDiscoverySection
              settings={settings}
              loading={settingsLoading}
            />
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
    </Flex>
  );
};

const SortableRow = ({
  node,
  selectedNodes,
  handleSelectNode,
  settings
}: {
  node: NodeDetail;
  selectedNodes: string[];
  handleSelectNode: (uuid: string, checked: boolean) => void;
  settings: any;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: node.uuid });
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(t("copy_success"));
  }
  return (
    <TableRow ref={setNodeRef} style={style} className="hover:bg-accent-a2">
      <TableCell>
        <div
          {...attributes}
          {...listeners}
          className={`cursor-move p-2 rounded hover:bg-accent-a3 transition-colors ${
            isMobile ? "touch-manipulation select-none" : ""
          }`}
          style={{
            touchAction: "none", // 禁用移动端的默认手势
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          title={
            isMobile
              ? t("admin.nodeTable.dragToReorder", "长按拖拽重新排序")
              : undefined
          }
        >
          <MenuIcon size={isMobile ? 18 : 16} color={"var(--gray-8)"} />
        </div>
      </TableCell>
      <TableCell>
        <Checkbox
          checked={selectedNodes.includes(node.uuid)}
          onCheckedChange={(checked) => handleSelectNode(node.uuid, !!checked)}
        />
      </TableCell>
      <TableCell>
        <DetailView node={node} />
      </TableCell>
      <TableCell>
        <Flex direction="column">
          {node.ipv4 && (
            <Text size="2" className="flex items-center gap-1">
              {node.ipv4}
              <IconButton variant="ghost" onClick={() => copy(node.ipv4)}>
                <Copy size="16" />
              </IconButton>
            </Text>
          )}
          {node.ipv6 && (
            <Text
              size="2"
              className="flex items-center gap-1"
              title={node.ipv6}
            >
              {node.ipv6.length > 20
                ? (() => {
                    const segments = node.ipv6.split(":");
                    return segments.length > 3
                      ? `${segments.slice(0, 2).join(":")}:...${
                          segments[segments.length - 1]
                        }`
                      : node.ipv6;
                  })()
                : node.ipv6}
              <IconButton variant="ghost" onClick={() => copy(node.ipv6)}>
                <Copy size="16" />
              </IconButton>
            </Text>
          )}
        </Flex>
      </TableCell>
      <TableCell>{node.version}</TableCell>
      <TableCell>
        <Text
          size="2"
          title={node.group}
          style={{
            maxWidth: "150px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.group && node.group.length > 10
            ? `${node.group.slice(0, 10)}...`
            : node.group}
        </Text>
      </TableCell>
      <TableCell>
        <Text
          size="2"
          title={node.remark}
          style={{
            maxWidth: "150px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.remark && node.remark.length > 10
            ? `${node.remark.slice(0, 10)}...`
            : node.remark}
        </Text>
      </TableCell>
      <TableCell>
        <PriceTags
          price={node.price}
          billing_cycle={node.billing_cycle}
          expired_at={node.expired_at}
          currency={node.currency}
          tags={node.tags || ""}
        />
      </TableCell>
      <TableCell>
        <ActionButtons node={node} settings={settings} />
      </TableCell>
    </TableRow>
  );
};

const NodeTable = ({
  nodes,
  selectedNodes,
  setSelectedNodes,
  settings,
}: {
  nodes: NodeDetail[];
  selectedNodes: string[];
  setSelectedNodes: (nodes: string[]) => void;
  settings: any;
}) => {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // 需要按住 10px 距离才开始拖拽，避免与点击冲突
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // 移动端需要按住 5px 距离才开始拖拽，并且延迟 200ms，避免与滚动冲突
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  );
  // 添加 localNodes 状态，实现即时 UI 更新
  const [localNodes, setLocalNodes] = useState<NodeDetail[]>(nodes);
  const [isDragging, setIsDragging] = useState(false);
  React.useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);
  const handleDragStart = () => {
    setIsDragging(true);
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleDragEnd = async (event: any) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localNodes.findIndex((node) => node.uuid === active.id);
    const newIndex = localNodes.findIndex((node) => node.uuid === over.id);
    const reorderedNodes = Array.from(localNodes);
    const [reorderedItem] = reorderedNodes.splice(oldIndex, 1);
    reorderedNodes.splice(newIndex, 0, reorderedItem);

    // 立即更新 UI
    setLocalNodes(reorderedNodes);

    if ("vibrate" in navigator) {
      navigator.vibrate([30, 10, 30]);
    }

    try {
      const orderData = reorderedNodes.reduce((acc, node, index) => {
        acc[node.uuid] = index;
        return acc;
      }, {} as Record<string, number>);

      await fetch("/api/admin/client/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      // 不再调用 refresh，以免覆盖本地排序
    } catch {
      toast.error(t("admin.nodeTable.errorRefreshNodeList"));
    }
  };

  // 更新全选逻辑，使用 localNodes
  const handleSelectAll = (checked: boolean) => {
    setSelectedNodes(checked ? localNodes.map((node) => node.uuid) : []);
  };

  const handleSelectNode = (uuid: string, checked: boolean) => {
    setSelectedNodes(
      checked
        ? [...selectedNodes, uuid]
        : selectedNodes.filter((id) => id !== uuid)
    );
  };
  return (
    <div
      className={`rounded-md overflow-hidden ${
        isDragging ? "select-none" : ""
      }`}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>
                <Checkbox
                  checked={
                    selectedNodes.length === localNodes.length &&
                    localNodes.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>{t("admin.nodeTable.name")}</TableHead>
              <TableHead>{t("admin.nodeTable.ipAddress")}</TableHead>
              <TableHead>{t("admin.nodeTable.clientVersion")}</TableHead>
              <TableHead>{t("common.group")}</TableHead>
              <TableHead>{t("admin.nodeEdit.remark")}</TableHead>
              <TableHead>{t("admin.nodeTable.billing")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext
              items={localNodes.map((node) => node.uuid)}
              strategy={verticalListSortingStrategy}
            >
              {localNodes.map((node) => (
                <SortableRow
                  key={node.uuid}
                  node={node}
                  selectedNodes={selectedNodes}
                  handleSelectNode={handleSelectNode}
                  settings={settings}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
};

type Platform = "linux" | "windows" | "macos" | "docker";
const ActionButtons = ({ node, settings }: { node: NodeDetail, settings: any }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4">
      <GenerateCommandButton node={node} settings={settings} />
      <IconButton
        title={t("terminal.title")}
        variant="ghost"
        onClick={() => {
          window.open(`/terminal?uuid=${node.uuid}`, "_blank");
        }}
      >
        <Terminal size="18" />
      </IconButton>
      <EditButton node={node} />
      <BillingButton node={node} />
      {node.require_sign_in && <SignInButton node={node} />}
      <DeleteButton node={node} />
    </div>
  );
};

export default NodeDetailsPage;
function DeleteButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await fetch(`/api/admin/client/${node.uuid}/remove`, {
        method: "POST",
      });
      toast.success(`Delete ${node.name}`);
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="red" title={t("delete")}>
          <Trash2Icon size="18" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>{t("delete")}</Dialog.Title>
        <Dialog.Description>
          {t("admin.nodeTable.confirmDelete")}
        </Dialog.Description>
        <Flex justify="end" gap="2" mt="4">
          <Dialog.Close>
            <Button variant="soft">{t("admin.nodeTable.cancel")}</Button>
          </Dialog.Close>
          <Button disabled={deleting} color="red" onClick={handleDelete}>
            {t("admin.nodeTable.confirmDelete")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function SignInButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const { refresh, updateNode } = useNodeDetails();
  const [open, setOpen] = React.useState(false);
  const [signingIn, setSigningIn] = React.useState(false);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      const res = await fetch(`/api/admin/client/${node.uuid}/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      // 即时更新：接口返回新 expired_at，直接 patch context，无需等待 refresh 网络往返。
      if (data.expired_at) {
        updateNode(node.uuid, { expired_at: data.expired_at });
      }
      toast.success(t("admin.nodeTable.signInSuccess", "签到成功"));
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(
        `${t("admin.nodeTable.signInFailed", "签到失败")}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setSigningIn(false);
    }
  };

  const nextDate = (() => {
    const now = new Date();
    const base =
      node.expired_at &&
      now.getTime() - new Date(node.expired_at).getTime() < 30 * 86400 * 1000
        ? new Date(node.expired_at)
        : now;
    const d = new Date(base);
    d.setDate(d.getDate() + (node.sign_in_interval_days || 30));
    return d;
  })();

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger>
        <IconButton
          variant="ghost"
          color="violet"
          title={t("admin.nodeTable.signInBadge", "签到")}
        >
          <ClipboardCheck size="18" />
        </IconButton>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>{t("admin.nodeTable.signInBadge", "签到")}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {t("admin.nodeTable.signInConfirm", "确认签到？下次截止时间将更新为 {{date}}", {
            date: formatDate(nextDate, { year: "numeric", month: "2-digit", day: "2-digit" })
          })}
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              {t("cancel")}
            </Button>
          </AlertDialog.Cancel>
          <Button
            variant="solid"
            color="violet"
            onClick={handleSignIn}
            loading={signingIn}
          >
            {t("confirm")}
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

type InstallOptions = {
  disableWebSsh: boolean;
  disableAutoUpdate: boolean;
  ignoreUnsafeCert: boolean;
  memoryIncludeCache: boolean;
  getIpAddrFromNic: boolean;
  enableGpu: boolean;
  checkNatType: boolean;
  ghproxy: string;
  dir: string;
  serviceName: string;
  includeNics: string;
  excludeNics: string;
  includeMountpoints: string;
  interval: string;
  monthRotate: string;
};
function GenerateCommandButton({ node, settings }: { node: NodeDetail, settings: any }) {
  const [selectedPlatform, setSelectedPlatform] =
    React.useState<Platform>("linux");
  const [installOptions, setInstallOptions] = React.useState<InstallOptions>({
    disableWebSsh: false,
    disableAutoUpdate: false,
    ignoreUnsafeCert: false,
    memoryIncludeCache: false,
    getIpAddrFromNic: false,
    enableGpu: false,
    checkNatType: false,
    ghproxy: "",
    dir: "",
    serviceName: "",
    includeNics: "",
    excludeNics: "",
    includeMountpoints: "",
    interval: "",
    monthRotate: "",
  });

  const [enableGhproxy, setEnableGhproxy] = React.useState(false);
  const [enableCustomDir, setEnableCustomDir] = React.useState(false);
  const [enableCustomServiceName, setEnableCustomServiceName] =
    React.useState(false);
  const [enableIncludeNics, setEnableIncludeNics] = React.useState(false);
  const [enableExcludeNics, setEnableExcludeNics] = React.useState(false);
  const [enableIncludeMountpoints, setEnableIncludeMountpoints] =
    React.useState(false);
  const [enableInterval, setEnableInterval] = React.useState(false);
  const [enableMonthRotate, setEnableMonthRotate] = React.useState(false);

  // 前台隐藏开关：初值取节点当前 hidden（新建/未设置默认 false，符合“默认不勾选”）。
  // 不进安装命令参数，而是即时调用编辑接口设置 server 端节点属性（与编辑对话框同形态）。
  const { refresh } = useNodeDetails();
  const [nodeHidden, setNodeHidden] = React.useState<boolean>(
    node.hidden ?? false
  );
  React.useEffect(() => {
    setNodeHidden(node.hidden ?? false);
  }, [node.hidden]);

  const generateCommand = () => {
    const host = function () {
      if (!settings.script_domain) {
        return window.location.origin;
      }
      if (settings.script_domain.startsWith("http")) {
        return settings.script_domain.replace(/\/+$/, "");
      }
      return `http://${settings.script_domain.replace(/\/+$/, "")}`;
    }();
    const token = node.token || "";
    let args = ["-e", host, "-t", token];
    // 根据安装选项生成参数
    if (installOptions.disableWebSsh) {
      args.push("--disable-web-ssh");
    }
    if (installOptions.disableAutoUpdate) {
      args.push("--disable-auto-update");
    }
    if (installOptions.ignoreUnsafeCert) {
      args.push("--ignore-unsafe-cert");
    }
    if (installOptions.memoryIncludeCache) {
      args.push("--memory-include-cache");
    }
    if (installOptions.getIpAddrFromNic) {
      args.push("--get-ip-addr-from-nic");
    }
    if (installOptions.enableGpu) {
      args.push("--gpu");
    }
    if (installOptions.checkNatType) {
      args.push("--check-nat-type");
    }
    const ghproxy = installOptions.ghproxy.trim();
    if (enableGhproxy && ghproxy) {
      const finalUrl = (
        ghproxy.startsWith("http")
          ? ghproxy
          : `http://${ghproxy}`
      ).replace(/\/+$/, "");
      args.push(`--install-ghproxy`);
      args.push(finalUrl);
    }
    const installDir = installOptions.dir.trim();
    if (enableCustomDir && installDir) {
      args.push(`--install-dir`);
      args.push(installDir);
    }
    const serviceName = installOptions.serviceName.trim();
    if (enableCustomServiceName && serviceName) {
      args.push(`--install-service-name`);
      args.push(serviceName);
    }
    const includeNics = installOptions.includeNics.trim();
    if (enableIncludeNics && includeNics) {
      args.push(`--include-nics`);
      args.push(includeNics);
    }
    const excludeNics = installOptions.excludeNics.trim();
    if (enableExcludeNics && excludeNics) {
      args.push(`--exclude-nics`);
      args.push(excludeNics);
    }
    const includeMountpoints = installOptions.includeMountpoints.trim();
    if (enableIncludeMountpoints && includeMountpoints) {
      args.push(`--include-mountpoint`);
      args.push(includeMountpoints);
    }
    if (enableInterval) {
      const intervalVal = Number.parseFloat((installOptions.interval || "").trim());
      args.push("-i");
      args.push(Number.isFinite(intervalVal) && intervalVal >= 1 ? String(intervalVal) : "1");
    }
    if (enableMonthRotate) {
      const rotateVal = (installOptions.monthRotate || "").trim() || "1"; // 默认 1
      args.push(`--month-rotate`);
      args.push(rotateVal);
    }
    let scriptFile = "install.sh";
    if (selectedPlatform === "windows") {
      scriptFile = "install.ps1";
    }
    let scriptUrl =
      `https://raw.githubusercontent.com/zv201413/komari-agent_new/refs/heads/main/${scriptFile}`;
    if (enableGhproxy) {
      if (enableGhproxy && ghproxy) {
        scriptUrl = scriptUrl.slice(8); // 去掉 https://
        if (ghproxy.endsWith("/")) {
          scriptUrl = `${ghproxy}${scriptUrl}`;
        } else {
          scriptUrl = `${ghproxy}/${scriptUrl}`;
        }
        if (!scriptUrl.startsWith("http")) {
          scriptUrl = `http://${scriptUrl}`;
        }
      }
    }
    let finalCommand = "";
    switch (selectedPlatform) {
      case "linux":
        finalCommand = `(command -v curl >/dev/null 2>&1 && curl -sL ${scriptUrl} || wget -qO- ${scriptUrl}) | bash -s -- ` + quoteShellArgs(args);
        break;
      case "windows":
        finalCommand =
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ` +
          `"iwr ${quotePowerShellArg(scriptUrl)}` +
          ` -UseBasicParsing -OutFile 'install.ps1'; &` +
          ` '.\\install.ps1'`;
        args.forEach((arg) => {
          finalCommand += ` ${quotePowerShellArg(arg)}`;
        });
        finalCommand += `"`;
        break;
      case "macos":
        finalCommand =
          `zsh <(curl -sL ${quoteShellArg(scriptUrl)}) ` + quoteShellArgs(args);
        break;
      case "docker": {
        // Docker 运行时不支持安装脚本专用参数，剔除它们及其取值
        const installOnlyFlags = [
          "--install-ghproxy",
          "--install-dir",
          "--install-service-name",
        ];
        const dockerArgs: string[] = [];
        for (let i = 0; i < args.length; i++) {
          if (installOnlyFlags.includes(args[i])) {
            i++; // 跳过该标志的取值
            continue;
          }
          dockerArgs.push(args[i]);
        }
        finalCommand =
          `docker run -d --name komari-agent --restart=always ` +
          `ghcr.io/komari-monitor/komari-agent:latest ` +
          quoteShellArgs(dockerArgs);
        break;
      }
    }
    return finalCommand;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copy_success", "已复制到剪贴板"));
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };
  const { t } = useTranslation();

  // 切换“前台隐藏”：复用编辑接口（与编辑对话框同一 body 形态，后端按字段更新，
  // 不覆盖 group/tags/traffic 等未提交字段）。即时生效，成功后刷新列表，失败回滚开关。
  const updateNodeHidden = async (hidden: boolean) => {
    setNodeHidden(hidden);
    try {
      const res = await fetch(`/api/admin/client/${node.uuid}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: node.name,
          token: node.token ?? "",
          remark: node.remark ?? "",
          public_remark: node.public_remark ?? "",
          hidden,
        }),
      });
      if (res.ok) {
        toast.success(t("admin.nodeEdit.saveSuccess", "保存成功"));
        refresh();
      } else {
        toast.error(t("admin.nodeEdit.saveError", "保存失败"));
        setNodeHidden(!hidden);
      }
    } catch {
      toast.error(t("admin.nodeEdit.saveError", "保存失败"));
      setNodeHidden(!hidden);
    }
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <IconButton variant="ghost" title={t("admin.nodeTable.installCommand")}>
          <Download size="18" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>
          {t("admin.nodeTable.installCommand", "一键部署指令")}
        </Dialog.Title>
        <div className="flex flex-col gap-4">
          <SegmentedControl.Root
            value={selectedPlatform}
            onValueChange={(value) => setSelectedPlatform(value as Platform)}
          >
            <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
            <SegmentedControl.Item value="windows">
              Windows
            </SegmentedControl.Item>
            <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
            <SegmentedControl.Item value="docker">Docker</SegmentedControl.Item>
          </SegmentedControl.Root>

          <Flex direction="column" gap="2">
            <label className="text-base font-bold">
              {t("admin.nodeTable.installOptions", "安装选项")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.disableWebSsh}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableWebSsh: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableWebSsh: !prev.disableWebSsh,
                    }));
                  }}
                >
                  {t("admin.nodeTable.disableWebSsh")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.disableAutoUpdate}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableAutoUpdate: Boolean(checked),
                    }));
                  }}
                ></Checkbox>
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableAutoUpdate: !prev.disableAutoUpdate,
                    }));
                  }}
                >
                  {t("admin.nodeTable.disableAutoUpdate", "禁用自动更新")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.ignoreUnsafeCert}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      ignoreUnsafeCert: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      ignoreUnsafeCert: !prev.ignoreUnsafeCert,
                    }));
                  }}
                >
                  {t("admin.nodeTable.ignoreUnsafeCert", "忽略不安全证书")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.memoryIncludeCache}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      memoryIncludeCache: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      memoryIncludeCache: !prev.memoryIncludeCache,
                    }));
                  }}
                >
                  {t("admin.nodeTable.memoryModeAvailable", "监测可用内存")}
                </label>
                <Tips size="14">
                  {t("admin.nodeTable.memoryModeAvailable_tip")}
                </Tips>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.getIpAddrFromNic}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      getIpAddrFromNic: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      getIpAddrFromNic: !prev.getIpAddrFromNic,
                    }));
                  }}
                >
                  {t("admin.nodeTable.getIpAddrFromNic", "从网卡获取 IP 地址")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.enableGpu}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      enableGpu: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      enableGpu: !prev.enableGpu,
                    }));
                  }}
                >
                  {t("admin.nodeTable.enableGpuMonitoring", "启用详细 GPU 监控")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.checkNatType}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      checkNatType: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      checkNatType: !prev.checkNatType,
                    }));
                  }}
                >
                  {t("admin.nodeTable.checkNatType", "检查 NAT 类型")}
                </label>
              </Flex>
            </div>
            {/* 前台隐藏（仅管理员可见）：默认不勾选，即时生效，独立于安装命令参数 */}
            <Flex direction="column" gap="1">
              <Flex gap="2" align="center">
                <Switch
                  checked={nodeHidden}
                  onCheckedChange={(checked) =>
                    updateNodeHidden(Boolean(checked))
                  }
                />
                <label
                  className="text-sm font-normal cursor-pointer"
                  onClick={() => updateNodeHidden(!nodeHidden)}
                >
                  {t("admin.nodeEdit.hidden", "隐藏节点")}
                </label>
              </Flex>
              <Text size="1" color="gray">
                {t(
                  "admin.nodeEdit.hidden_description",
                  "在未登陆的情况下隐藏该节点"
                )}
              </Text>
            </Flex>
            <Flex direction="column" gap="2">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableGhproxy}
                  onCheckedChange={(checked) => {
                    setEnableGhproxy(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        ghproxy: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableGhproxy(!enableGhproxy);
                    if (enableGhproxy) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        ghproxy: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.ghproxy", "GitHub 代理")}
                </label>
              </Flex>
              {enableGhproxy && (
                <TextField.Root
                  // placeholder={t(
                  //   "admin.nodeTable.ghproxy_placeholder",
                  //   "GitHub 代理，为空则不使用代理"
                  // )}
                  placeholder="https://ghfast.top/"
                  value={installOptions.ghproxy}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      ghproxy: e.target.value,
                    }))
                  }
                />
              )}

              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableCustomDir}
                  onCheckedChange={(checked) => {
                    setEnableCustomDir(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        dir: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableCustomDir(!enableCustomDir);
                    if (enableCustomDir) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        dir: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.install_dir", "安装目录")}
                </label>
              </Flex>
              {enableCustomDir && (
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.install_dir_placeholder",
                    "安装目录，为空则使用默认目录(/opt/komari-agent)"
                  )}
                  value={installOptions.dir}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      dir: e.target.value,
                    }))
                  }
                />
              )}

              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableCustomServiceName}
                  onCheckedChange={(checked) => {
                    setEnableCustomServiceName(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        serviceName: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableCustomServiceName(!enableCustomServiceName);
                    if (enableCustomServiceName) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        serviceName: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.serviceName", "服务名称")}
                </label>
              </Flex>
              {enableCustomServiceName && (
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.serviceName_placeholder",
                    "服务名称，为空则使用默认名称(komari-agent)"
                  )}
                  value={installOptions.serviceName}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      serviceName: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableIncludeNics}
                  onCheckedChange={(checked) => {
                    setEnableIncludeNics(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeNics: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableIncludeNics(!enableIncludeNics);
                    if (enableIncludeNics) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeNics: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.includeNics", "只监测特定网卡")}
                </label>
              </Flex>
              {enableIncludeNics && (
                <TextField.Root
                  // placeholder={t(
                  //   "admin.nodeTable.includeNics_placeholder",
                  //   "多个网卡使用逗号隔开"
                  // )}
                  placeholder="eth0,eth1"
                  value={installOptions.includeNics}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeNics: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableExcludeNics}
                  onCheckedChange={(checked) => {
                    setEnableExcludeNics(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        excludeNics: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableExcludeNics(!enableExcludeNics);
                    if (enableExcludeNics) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        excludeNics: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.excludeNics", "排除特定网卡")}
                </label>
              </Flex>
              {enableExcludeNics && (
                <TextField.Root
                  // placeholder={t(
                  //   "admin.nodeTable.excludeNics_placeholder",
                  //   "多个网卡使用逗号隔开"
                  // )}
                  placeholder="lo"
                  value={installOptions.excludeNics}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      excludeNics: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableIncludeMountpoints}
                  onCheckedChange={(checked) => {
                    setEnableIncludeMountpoints(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeMountpoints: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableIncludeMountpoints(!enableIncludeMountpoints);
                    if (enableIncludeMountpoints) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeMountpoints: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.includeMountpoints", "只监测特定挂载点")}
                </label>
              </Flex>
              {enableIncludeMountpoints && (
                <TextField.Root
                  placeholder="/;/home;/var"
                  value={installOptions.includeMountpoints}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeMountpoints: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableInterval}
                  onCheckedChange={(checked) => {
                    const enabled = Boolean(checked);
                    setEnableInterval(enabled);
                    if (!enabled) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        interval: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        interval: prev.interval?.trim() ? prev.interval : "1",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    const willEnable = !enableInterval;
                    setEnableInterval(willEnable);
                    if (!willEnable) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        interval: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        interval: prev.interval?.trim() ? prev.interval : "1",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.interval", "采集间隔(秒)")}
                </label>
              </Flex>
              {enableInterval && (
                <TextField.Root
                  placeholder="1"
                  type="number"
                  min="1"
                  step="0.1"
                  value={installOptions.interval}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      interval: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableMonthRotate}
                  onCheckedChange={(checked) => {
                    const enabled = Boolean(checked);
                    setEnableMonthRotate(enabled);
                    if (!enabled) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: prev.monthRotate?.trim()
                          ? prev.monthRotate
                          : "1",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    const willEnable = !enableMonthRotate;
                    setEnableMonthRotate(willEnable);
                    if (!willEnable) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: prev.monthRotate?.trim()
                          ? prev.monthRotate
                          : "1",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.monthRotate", "网络统计月重置")}
                </label>
              </Flex>
              {enableMonthRotate && (
                <TextField.Root
                  placeholder="1"
                  type="number"
                  min="1"
                  max="31"
                  value={installOptions.monthRotate}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      monthRotate: e.target.value,
                    }))
                  }
                />
              )}
            </Flex>
          </Flex>
          <Flex direction="column" gap="2">
            <label className="text-base font-bold">
              {t("admin.nodeTable.generatedCommand", "生成的指令")}
            </label>
            <div className="relative">
              <TextArea
                disabled
                className="w-full"
                style={{ minHeight: "80px" }}
                value={generateCommand()}
              />
            </div>
          </Flex>
          <Flex justify="center">
            <Dialog.Close>
              <Button
                style={{ width: "100%" }}
                onClick={() => copyToClipboard(generateCommand())}
              >
                <Copy size={16} />
                {t("copy")}
              </Button>
            </Dialog.Close>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function EditButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { refresh } = useNodeDetails();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const groupRef = React.useRef<HTMLInputElement>(null);
  const tagsRef = React.useRef<HTMLInputElement>(null);
  const publicRemarkRef = React.useRef<HTMLTextAreaElement>(null);
  const privateRemarkRef = React.useRef<HTMLTextAreaElement>(null);
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [traffic_limit, setTrafficLimit] = useState(0);
  const [traffic_limit_type, setTrafficLimitType] = useState("sum");
  // 已用流量校正：输入真实已用值(字符串，经 stringToBytes 解析)，由后端换算为偏移量
  const [calibUp, setCalibUp] = useState("");
  const [calibDown, setCalibDown] = useState("");
  const [calibrating, setCalibrating] = useState(false);

  React.useEffect(() => {
    setHidden(node.hidden);
    setTrafficLimit(node.traffic_limit || 0);
    setTrafficLimitType(node.traffic_limit_type || "sum");
  }, [node.hidden, node.traffic_limit, node.traffic_limit_type]);

  const save = async () => {
    try {
      setSaving(true);
      await fetch(`/api/admin/client/${node.uuid}/edit`, {
        method: "POST",
        body: JSON.stringify({
          name: nameRef.current?.value,
          remark: privateRemarkRef.current?.value,
          public_remark: publicRemarkRef.current?.value,
          group: groupRef.current?.value,
          tags: tagsRef.current?.value,
          hidden,
          traffic_limit,
          traffic_limit_type,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      refresh();
      setOpen(false);
      toast.success(t("admin.nodeEdit.saveSuccess", "保存成功"));
    } catch (error) {
      console.error("Error updating client:", error);
    } finally {
      setSaving(false);
    }
  };

  // 应用流量校正：发送真实已用流量(上传/下载，字节)，后端换算 offset = 真实值 − 当前实测并存储。
  const applyCalibration = async () => {
    const body: Record<string, number> = {};
    if (calibUp.trim()) body.set_traffic_used_up = stringToBytes(calibUp);
    if (calibDown.trim()) body.set_traffic_used_down = stringToBytes(calibDown);
    if (Object.keys(body).length === 0) return;
    try {
      setCalibrating(true);
      const res = await fetch(`/api/admin/client/${node.uuid}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(t("admin.nodeEdit.saveSuccess", "保存成功"));
        refresh();
      } else {
        toast.error(t("admin.nodeEdit.saveError", "保存失败"));
      }
    } catch {
      toast.error(t("admin.nodeEdit.saveError", "保存失败"));
    } finally {
      setCalibrating(false);
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          title={t("admin.nodeEdit.editInfo", "编辑信息")}
        >
          <Pencil size="18" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>{t("admin.nodeEdit.editInfo", "编辑信息")}</Dialog.Title>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.name", "名称")}
            </label>
            <TextField.Root
              defaultValue={node.name}
              placeholder={t("admin.nodeEdit.namePlaceholder", "请输入名称")}
              ref={nameRef}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.token", "Token 令牌")}
            </label>
            <TextField.Root
              value={node.token}
              placeholder={t("admin.nodeEdit.tokenPlaceholder", "请输入 Token")}
              readOnly
            />
          </div>
          <div>
            <label className="mb-1 text-sm font-medium text-muted-foreground flex items-center">
              {t("common.tags")}
              <label className="text-muted-foreground ml-1 text-xs self-end">
                {t("common.tagsDescription")}
              </label>
              <Tips>
                <span
                  dangerouslySetInnerHTML={{ __html: t("common.tagsTips") }}
                />
              </Tips>
            </label>
            <TextField.Root defaultValue={node.tags} ref={tagsRef} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("common.group")}
            </label>
            <TextField.Root defaultValue={node.group} ref={groupRef} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.remark", "私有备注")}
            </label>
            <TextArea
              defaultValue={node.remark}
              ref={privateRemarkRef}
              resize={"vertical"}
              placeholder={t(
                "admin.nodeEdit.remarkPlaceholder",
                "请输入私有备注"
              )}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.publicRemark", "公开备注")}
            </label>
            <TextArea
              defaultValue={node.public_remark}
              resize={"vertical"}
              placeholder={t(
                "admin.nodeEdit.publicRemarkPlaceholder",
                "请输入公开备注"
              )}
              ref={publicRemarkRef}
            />
          </div>
          <div>
            <SettingCardSwitch
              title={t("admin.nodeEdit.hidden")}
              description={t("admin.nodeEdit.hidden_description")}
              defaultChecked={hidden}
              onChange={setHidden}
            />
          </div>
          <SettingCardCollapse title={t("admin.nodeEdit.trafficLimit")}>
            <SettingCardSelect
              bordless
              title={t("admin.nodeEdit.trafficLimitType")}
              defaultValue={node.traffic_limit_type || "max"}
              options={[
                {
                  label: t("admin.nodeEdit.trafficLimitType_sum"),
                  value: "sum",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_max"),
                  value: "max",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_min"),
                  value: "min",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_up"),
                  value: "up",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_down"),
                  value: "down",
                },
              ]}
              OnSave={(value) => {
                setTrafficLimitType(value);
              }}
            />
            <SettingCardShortTextInput
              bordless
              title={t("admin.nodeEdit.trafficLimit")}
              description={t("admin.nodeEdit.trafficLimit_description")}
              defaultValue={formatBytes(traffic_limit || 0)}
              showSaveButton={false}
              onChange={(e) => {
                setTrafficLimit(stringToBytes(e.currentTarget.value));
              }}
              onBlur={(e) => {
                e.currentTarget.value = formatBytes(traffic_limit);
              }}
            ></SettingCardShortTextInput>
            <div className="mt-2 border-t border-(--gray-a4) pt-2" />
            <SettingCardShortTextInput
              bordless
              title={t("admin.nodeEdit.trafficCalibrateUp", "校正已用上传")}
              description={t(
                "admin.nodeEdit.trafficCalibrate_description",
                "输入商家面板显示的真实已用流量，面板将校准到该值并继续累加。上传/下载可单独校正，只填写需要校正的一项即可。"
              )}
              defaultValue=""
              showSaveButton={false}
              onChange={(e) => setCalibUp(e.currentTarget.value)}
            ></SettingCardShortTextInput>
            <SettingCardShortTextInput
              bordless
              title={t("admin.nodeEdit.trafficCalibrateDown", "校正已用下载")}
              defaultValue=""
              showSaveButton={false}
              onChange={(e) => setCalibDown(e.currentTarget.value)}
            ></SettingCardShortTextInput>
            <Flex justify="end" className="mt-2">
              <Button
                type="button"
                variant="soft"
                disabled={
                  calibrating || (!calibUp.trim() && !calibDown.trim())
                }
                onClick={applyCalibration}
              >
                {calibrating
                  ? t("admin.nodeEdit.waiting", "等待...")
                  : t("admin.nodeEdit.trafficCalibrateApply", "应用流量校正")}
              </Button>
            </Flex>
          </SettingCardCollapse>
        </div>
        <Flex gap="2" justify={"end"} className="mt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={saving}
            onClick={save}
          >
            {saving
              ? t("admin.nodeEdit.waiting", "等待...")
              : t("save", "保存")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function DetailView({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <div className="h-8 flex items-center hover:underline cursor-pointer font-bold text-base">
          <Flag flag={node.region} size="6" />
          {node.name.length > 25 ? node.name.slice(0, 25) + "..." : node.name}
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{node.name}</DrawerTitle>
          <DrawerDescription>
            {t("admin.nodeDetail.machineDetail", "机器详细信息")}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-ip">
                  {t("admin.nodeDetail.ipAddress", "IP 地址")}
                </label>
                <div className="flex flex-col gap-1">
                  {node.ipv4 && (
                    <div className="flex items-center gap-1">
                      <span
                        id="detail-ipv4"
                        className="bg-muted px-3 py-2 rounded border flex-1 min-w-0 select-text"
                      >
                        {node.ipv4}
                      </span>
                      <IconButton
                        variant="ghost"
                        className="size-5"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(node.ipv4!);
                        }}
                      >
                        <Copy size={16} />
                      </IconButton>
                    </div>
                  )}
                  {node.ipv6 && (
                    <div className="flex items-center gap-1">
                      <span
                        id="detail-ipv6"
                        className="bg-muted px-3 py-2 rounded border flex-1 min-w-0 select-text"
                      >
                        {node.ipv6}
                      </span>
                      <IconButton
                        variant="ghost"
                        className="size-5"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(node.ipv6!);
                        }}
                      >
                        <Copy size={16} />
                      </IconButton>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-version">
                  {t("admin.nodeDetail.clientVersion", "客户端版本")}
                </label>
                <span
                  id="detail-version"
                  className="bg-muted px-3 py-2 rounded border select-text"
                >
                  {node.version || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-os">
                  {t("admin.nodeDetail.os", "操作系统")}
                </label>
                <span
                  id="detail-os"
                  className="bg-muted px-3 py-2 rounded border select-text"
                >
                  {node.os || <span className="text-muted-foreground">-</span>}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-arch">
                  {t("admin.nodeDetail.arch", "架构")}
                </label>
                <span
                  id="detail-arch"
                  className="bg-muted px-3 py-2 rounded border select-text"
                >
                  {node.arch || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-cpu_name">
                  {t("admin.nodeDetail.cpu", "CPU")}
                </label>
                <span
                  id="detail-cpu_name"
                  className="bg-muted px-3 py-2 rounded border select-text"
                >
                  {node.cpu_name || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-cpu_cores">
                  {t("admin.nodeDetail.cpuCores", "CPU 核心数")}
                </label>
                <span
                  id="detail-cpu_cores"
                  className="bg-muted px-3 py-2 rounded border select-text"
                >
                  {node.cpu_cores?.toString() || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-mem_total">
                  {t("admin.nodeDetail.memTotal", "总内存 (Bytes)")}
                </label>
                <span
                  id="detail-mem_total"
                  className="bg-muted px-3 py-2 rounded border select-text"
                  title={
                    node.mem_total ? String(node.mem_total) + " Bytes" : "-"
                  }
                >
                  {formatBytes(node.mem_total)}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-disk_total">
                  {t("admin.nodeDetail.diskTotal", "总磁盘空间 (Bytes)")}
                </label>
                <span
                  id="detail-disk_total"
                  className="bg-muted px-3 py-2 rounded border select-text"
                  title={
                    node.disk_total ? String(node.disk_total) + " Bytes" : "-"
                  }
                >
                  {formatBytes(node.disk_total)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor="detail-gpu_name">
                {t("admin.nodeDetail.gpu", "GPU")}
              </label>
              <span
                id="detail-gpu_name"
                className="bg-muted px-3 py-2 rounded border select-text"
              >
                {node.gpu_name || (
                  <span className="text-muted-foreground">-</span>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor="detail-uuid">
                {t("admin.nodeDetail.uuid", "UUID")}
              </label>
              <span
                id="detail-uuid"
                className="bg-muted px-3 py-2 rounded border select-text"
              >
                {node.uuid || <span className="text-muted-foreground">-</span>}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-createdAt">
                  {t("admin.nodeDetail.createdAt", "创建时间")}
                </label>
                <span
                  id="detail-createdAt"
                  className="bg-muted px-3 py-2 rounded border select-text"
                >
                  {node.created_at ? (
                    formatDate(new Date(node.created_at), {})
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="detail-updatedAt">
                  {t("admin.nodeDetail.updatedAt", "更新时间")}
                </label>
                <span
                  id="detail-updatedAt"
                  className="bg-muted px-3 py-2 rounded border select-text"
                >
                  {node.updated_at ? (
                    formatDate(new Date(node.updated_at), {})
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </div>
            </div>
          </form>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button>{t("admin.nodeDetail.done", "完成")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function toLocalDateString(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 到期时间精确到分钟：datetime-local 需要 `YYYY-MM-DDTHH:mm`（本地时区）。
function toLocalDateTimeString(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function BillingButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billingCycle, setBillingCycle] = React.useState<string>(
    node.billing_cycle.toString()
  );
  // 计费周期预设项(单一数据源:同时驱动下拉与下方"当前周期"提示,label 随 t 变化故 i18n 安全)
  const billingOptions = [
    { label: t("common.monthly"), value: "30" },
    { label: t("common.quarterly"), value: "92" },
    { label: t("common.semi_annual"), value: "184" },
    { label: t("common.annual"), value: "365" },
    { label: t("common.biennial"), value: "730" },
    { label: t("common.triennial"), value: "1095" },
    { label: t("common.quinquennial"), value: "1825" },
    { label: t("common.once"), value: "-1" },
  ];
  // 当前选中周期的友好名:命中预设取其 label,否则按自定义天数显示;空或 0 不显示该行
  const billingMatched = billingOptions.find((o) => o.value === billingCycle);
  const billingDays = parseInt(billingCycle);
  const billingCurrentLabel = billingMatched
    ? billingMatched.label
    : !isNaN(billingDays) && billingDays > 0
      ? t("admin.nodeTable.billingCustomDays", "自定义 {days} 天").replace(
          "{days}",
          String(billingDays)
        )
      : "";
  const [autoRenewal, setAutoRenewal] = React.useState<boolean>(
    node.auto_renewal || false
  );
  const [currency, setCurrency] = React.useState<string>(node.currency || "$");
  const [expiredAt, setExpiredAt] = React.useState<string>(
    toLocalDateTimeString(node.expired_at)
  );

  const [requireSignIn, setRequireSignIn] = useState<boolean>(node.require_sign_in || false);
  const [signInMode, setSignInMode] = useState<"interval" | "target">(
    node.sign_in_target_date && node.sign_in_target_date !== "" ? "target" : "interval"
  );
  const [signInTargetDate, setSignInTargetDate] = useState<string>(
    toLocalDateString(node.sign_in_target_date)
  );
  const [signInIntervalDays, setSignInIntervalDays] = useState<string>(node.sign_in_interval_days?.toString() || "30");
  const [signInAlertDaysBefore, setSignInAlertDaysBefore] = useState<string>(node.sign_in_alert_days_before?.toString() || "3");
  const [signInAlertIntervalHours, setSignInAlertIntervalHours] = useState<string>(node.sign_in_alert_interval_hours?.toString() || "12");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const formData = new FormData(e.target as HTMLFormElement);
      const priceValue = (formData.get("price") as string) || "0";

      const price = parseFloat(priceValue);

      if (isNaN(price) || (price < 0 && price !== -1)) {
        toast.error(t("admin.nodeTable.invalidPrice"));
        return;
      }
      const billingCycleValue = parseInt(
        (formData.get("billingCycle") as string) || "30"
      );
      const expiredAtValue = (formData.get("expiredAt") as string) || "";
      // datetime-local 输入值已带 "T HH:mm"；纯日期值才补 T00:00:00
      let expiredAt = expiredAtValue
        ? new Date(
            expiredAtValue.includes("T")
              ? expiredAtValue
              : `${expiredAtValue}T00:00:00`
          ).toISOString()
        : null;
      // target 模式：目标日期即真实到期日。前台展示/天数/通知均以 expired_at 为唯一真值源，
      // 故同步写入 expired_at，否则保存后前台读旧值表现为「不变」。
      // 时分秒取当前时刻，避免归零到 0 点（与快捷签到行为一致）。
      const targetDateISO = (() => {
        if (signInMode !== "target" || !signInTargetDate) return null;
        const now = new Date();
        const d = new Date(`${signInTargetDate}T00:00:00`);
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
        return d.toISOString();
      })();
      if (targetDateISO) expiredAt = targetDateISO;
      const currencyValue = (formData.get("currency") as string) || "$";

      await fetch(`/api/admin/client/${node.uuid}/edit`, {
        method: "POST",
        body: JSON.stringify({
          price,
          billing_cycle: billingCycleValue,
          expired_at: expiredAt,
          currency: currencyValue,
          auto_renewal: autoRenewal,
          require_sign_in: requireSignIn,
          sign_in_interval_days: parseInt(signInIntervalDays) || 30,
          sign_in_alert_days_before: parseInt(signInAlertDaysBefore) || 3,
          sign_in_alert_interval_hours: parseInt(signInAlertIntervalHours) || 12,
          sign_in_target_date: targetDateISO,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      // await refresh() 确保 context 数据（含 localNodes）更新完毕再关对话框，实现即时显示。
      await refresh();
      setOpen(false);
    } catch (error) {
      toast.error("Failed to save billing information:" + error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          title={t("admin.nodeTable.billing", "账单")}
        >
          <CircleDollarSign size="18" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>{t("admin.nodeTable.billing", "账单")}</Dialog.Title>
        <form onSubmit={handleSave}>
          <Flex direction="column" gap="2">
            <div className={requireSignIn ? "opacity-50 pointer-events-none flex flex-col gap-2" : "flex flex-col gap-2"}>
            <label className="font-bold">
              <label>{t("admin.nodeTable.price")}</label>
              <label className="text-muted-foreground text-sm ml-1 font-medium">
                {t("admin.nodeTable.priceTips")}
              </label>
            </label>
            <TextField.Root name="price" defaultValue={node.price} />

            <label className="font-bold">
              <label>{t("admin.nodeTable.currency", "货币")}</label>
              <label className="text-muted-foreground text-sm ml-1 font-medium">
                {t("admin.nodeTable.currencyTips")}
              </label>
            </label>
            <TextField.Root
              name="currency"
              defaultValue={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />

            <label className="font-bold flex items-center gap-1">
              {t("admin.nodeTable.billingCycle")} <Tips><span dangerouslySetInnerHTML={{ __html: t("admin.nodeTable.billingCycleTips") }}></span></Tips>
            </label>
            <SelectOrInput
            options={billingOptions}
            type="number"
            name="billingCycle"
            value={billingCycle === "0" ? "" : billingCycle}
            onChange={setBillingCycle}
          />
            {billingCurrentLabel && (
              <label className="text-muted-foreground text-xs">
                {t("admin.nodeTable.billingCycleCurrent", "当前计费周期：{label}").replace(
                  "{label}",
                  billingCurrentLabel
                )}
              </label>
            )}
            <label className="text-muted-foreground text-xs">
              {t(
                "admin.nodeTable.billingCycleMonthlyNote",
                "「月 / 季 / 年」按自然月动态续费（实际 28 / 30 / 31 天），并非固定 30 天。例：到期日 3/31 续 1 个月 → 4/30。"
              )}
            </label>

            <Flex gap="2" align="center">
              <label className="font-bold">
                {t("admin.nodeTable.expiredAt")}
              </label>
            </Flex>
            <TextField.Root
              name="expiredAt"
              value={expiredAt}
              onChange={(e) => setExpiredAt(e.target.value)}
              type="datetime-local"
            >
              <TextField.Slot side="right">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const futureDate = new Date();
                    futureDate.setFullYear(futureDate.getFullYear() + 200);
                    setExpiredAt(toLocalDateTimeString(futureDate.toISOString()));
                  }}
                >
                  {t("admin.nodeTable.setToLongTerm", "设置为长期")}
                </Button>
              </TextField.Slot>
            </TextField.Root>
            <Flex gap="2" align="center"></Flex>
            <SettingCardSwitch
              title={t("admin.nodeTable.autoRenewal")}
              description={t("admin.nodeTable.autoRenewalDescription")}
              defaultChecked={node.auto_renewal || false}
              onChange={setAutoRenewal}
            />
            </div>

            {/* SignIn Section */}
            <div className="mt-4 border-t pt-4">
              <SettingCardSwitch
                title={t("admin.nodeTable.requireSignIn", "需要签到")}
                description={""}
                defaultChecked={requireSignIn}
                onChange={setRequireSignIn}
              />
              {requireSignIn && (
                <div className="flex flex-col gap-2 mt-4 pl-2 border-l-2 border-violet-500">
                  <label className="font-bold">{t("admin.nodeTable.signInMode", "签到模式")}</label>
                  <SegmentedControl.Root
                    value={signInMode}
                    onValueChange={(val: any) => setSignInMode(val)}
                  >
                    <SegmentedControl.Item value="interval">{t("admin.nodeTable.signInModeInterval", "按天数顺延")}</SegmentedControl.Item>
                    <SegmentedControl.Item value="target">{t("admin.nodeTable.signInModeTarget", "签到至指定日期")}</SegmentedControl.Item>
                  </SegmentedControl.Root>

                  {signInMode === "interval" ? (
                    <>
                      <label className="font-bold mt-2">{t("admin.nodeTable.signInInterval", "顺延天数")}</label>
                      <SelectOrInput
                        options={[
                          { label: "7 " + t("common.day", "天"), value: "7" },
                          { label: "14 " + t("common.day", "天"), value: "14" },
                          { label: "30 " + t("common.day", "天"), value: "30" },
                        ]}
                        type="number"
                        name="signInIntervalDays"
                        value={signInIntervalDays}
                        onChange={setSignInIntervalDays}
                      />
                    </>
                  ) : (
                    <>
                      <label className="font-bold mt-2">{t("admin.nodeTable.signInTargetDate", "目标日期")}</label>
                      <TextField.Root
                        type="date"
                        value={signInTargetDate}
                        onChange={(e) => setSignInTargetDate(e.target.value)}
                      />
                    </>
                  )}

                  <label className="font-bold">{t("admin.nodeTable.signInAlertDays", "提前提醒天数")}</label>
                  <TextField.Root
                    name="signInAlertDaysBefore"
                    type="number"
                    value={signInAlertDaysBefore}
                    onChange={(e) => setSignInAlertDaysBefore(e.target.value)}
                  />

                  <label className="font-bold">{t("admin.nodeTable.signInAlertHours", "提醒间隔 (小时)")}</label>
                  <TextField.Root
                    name="signInAlertIntervalHours"
                    type="number"
                    value={signInAlertIntervalHours}
                    onChange={(e) => setSignInAlertIntervalHours(e.target.value)}
                  />

                  {((signInMode === "interval" && expiredAt && expiredAt !== "0001-01-01") || (signInMode === "target" && signInTargetDate)) && (
                    <div className="text-sm text-gray-500 mt-2">
                      {t("admin.nodeTable.signInPreview", "首次提醒将于 {{date}} 发出，此后每 {{hours}} 小时提醒一次", {
                        date: signInMode === "target" 
                          ? new Date(new Date(signInTargetDate).getTime() - parseInt(signInAlertDaysBefore || "3") * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                          : new Date(new Date(expiredAt).getTime() - parseInt(signInAlertDaysBefore || "3") * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                        hours: signInAlertIntervalHours || "12"
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button type="submit" disabled={saving}>
              {t("save")}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
