import { useTranslation } from "react-i18next";
import { Button, Code, Flex, Text, TextField, Dialog } from "@radix-ui/themes";
import {
  updateSettingsWithToast,
  useSettings,
  type SettingsResponse,
} from "@/lib/api";
import {
  SettingCardButton,
  SettingCardCollapse,
  SettingCardLabel,
  SettingCardSelect,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import React from "react";
import { toast } from "sonner";
import Loading from "@/components/loading";
import { SettingCardMultiInputCollapse } from "@/components/admin/SettingCardMultiInput";
import { formatBytes } from "@/utils/unitHelper";
export default function GeneralSettings() {
  const { t } = useTranslation();
  const { settings, loading, error } = useSettings();
  const [geoip_testResult, setGeoipTestResult] = React.useState<string | null>(
    null
  );
  const [showDisableDialog, setShowDisableDialog] = React.useState(false);
  const [sudoDisableCode, setSudoDisableCode] = React.useState("");
  const [disablePromise, setDisablePromise] = React.useState<{resolve: () => void, reject: () => void} | null>(null);
  const [verifying, setVerifying] = React.useState(false);
  const [expected_usage, setExpectedUsage] = React.useState<string | null>(
    null
  );
  React.useEffect(() => {
    const pingPreserveTime = parseInt(
      settings.ping_record_preserve_time || "30",
      10
    );
    const recordPreserveTime = parseInt(
      settings.record_preserve_time || "30",
      10
    );
    if (isNaN(pingPreserveTime) || isNaN(recordPreserveTime)) {
      setExpectedUsage("0");
      return;
    } else {
      setExpectedUsage(
        calculateExpectedUsage(pingPreserveTime, recordPreserveTime)
      );
    }
  }, [settings.ping_record_preserve_time, settings.record_preserve_time]);
  if (loading) {
    return <Loading text="creeper?" />;
  }

  if (error) {
    return <Text color="red">{error}</Text>;
  }

  return (
    <>
      <SettingCardLabel>
        {t("settings.general.auto_discovery")}
      </SettingCardLabel>
      <ApiCard settings={settings} />
      <label className="text-xl font-bold">{t("settings.security.title", "安全配置")}</label>
      <SettingCardSwitch
        title={t("settings.sudo_2fa.title", "终端 Sudo 二次验证")}
        description={t("settings.sudo_2fa.description", "开启后，访问服务器终端前将强制要求输入管理员的 2FA 动态码")}
        defaultChecked={settings.sudo_2fa_required}
        onChange={async (checked) => {
          if (checked) {
            await updateSettingsWithToast({ sudo_2fa_required: true }, t);
          } else {
            return new Promise<void>((resolve, reject) => {
              setDisablePromise({ resolve, reject });
              setShowDisableDialog(true);
            });
          }
        }}
      />
      <label className="text-xl font-bold">{t("settings.geoip.title")}</label>
      <SettingCardSwitch
        title={t("settings.geoip.enable_title")}
        description={t("settings.geoip.enable_description")}
        defaultChecked={settings.geo_ip_enabled}
        onChange={async (checked) => {
          await updateSettingsWithToast({ geo_ip_enabled: checked }, t);
        }}
      />
      <SettingCardSelect
        title={t("settings.geoip.provider_title")}
        description={t("settings.geoip.provider_description")}
        defaultValue={settings.geo_ip_provider}
        options={[
          { value: "empty", label: t("common.none") },
          { value: "mmdb", label: "MaxMind" },
          { value: "ip-api", label: "ip-api.com" },
          { value: "geojs", label: "geojs.io" },
          { value: "ipinfo", label: "ipinfo.io" },
        ]}
        OnSave={async (value) => {
          await updateSettingsWithToast({ geo_ip_provider: value }, t);
        }}
      />
      <SettingCardButton
        title={t("settings.geoip.update_title", "更新 GeoIP 数据库")}
        onClick={async () => {
          const result = await fetch("/api/admin/update/mmdb", {
            method: "POST",
          });
          const data = await result.json();
          if (data.status === "success") {
            toast.success(
              t("settings.geoip.update_success", "GeoIP 数据库更新成功")
            );
          } else {
            toast.error(
              data.message ||
                t("settings.geoip.update_error", "更新 GeoIP 数据库失败")
            );
          }
        }}
      >
        {t("common.update", "更新")}
      </SettingCardButton>
      <SettingCardCollapse
        title={t("settings.geoip.test_title")}
        description={t("settings.geoip.test_description")}
      >
        <Flex className="w-full gap-2" direction="column">
          <TextField.Root placeholder="1.1.1.1 or 2606:4700:4700::1111"></TextField.Root>
          <div>
            <Button
              variant="solid"
              onClick={async () => {
                const ip = (
                  document.querySelector(
                    "input[placeholder]"
                  ) as HTMLInputElement
                ).value;
                const result = await fetch(`/api/admin/test/geoip?ip=${ip}`);
                const data = await result.json();
                setGeoipTestResult(
                  JSON.stringify(data.data, null, 2) || "无结果"
                );
              }}
            >
              {t("settings.geoip.test_button", "测试")}
            </Button>
          </div>{" "}
          <Flex className="w-full">
            {geoip_testResult && (
              <Code
                className="w-full whitespace-pre-wrap text-sm p-3 rounded-md overflow-auto max-h-96"
                style={{ display: "block" }}
              >
                {geoip_testResult}
              </Code>
            )}
          </Flex>
        </Flex>
      </SettingCardCollapse>
      <label className="text-xl font-bold">{t("settings.record.title")}</label>
      <SettingCardSwitch
        title={t("settings.record.enabled")}
        description={t("settings.record.enabled_description")}
        defaultChecked={settings.record_enabled}
        onChange={async (checked) => {
          await updateSettingsWithToast({ record_enabled: checked }, t);
        }}
      />
      <SettingCardMultiInputCollapse
        defaultOpen
        title={t("settings.record.record_preserve_time")}
        description={t("settings.record.record_preserve_time_description")}
        items={[
          {
            tag: "record_preserve_time",
            label: t("settings.record.record_preserve_time_label"),
            type: "short",
            placeholder: "30",
            defaultValue: settings.record_preserve_time || "30",
            number: true,
          },
          {
            tag: "ping_record_preserve_time",
            label: t("settings.record.ping_record_preserve_time"),
            type: "short",
            placeholder: "30",
            defaultValue: settings.ping_record_preserve_time || "30",
            number: true,
          },
        ]}
        onSave={async (values) => {
          const preserveTime = parseInt(values.record_preserve_time, 10);
          const pingPreserveTime = parseInt(
            values.ping_record_preserve_time,
            10
          );
          if (isNaN(preserveTime) || isNaN(pingPreserveTime)) {
            toast.error(t("settings.record.invalid_preserve_time"));
            return;
          }
          await updateSettingsWithToast(
            {
              record_preserve_time: preserveTime,
              ping_record_preserve_time: pingPreserveTime,
            },
            t
          );
        }}
        onChange={(values) => {
          const preserveTime = parseInt(values.record_preserve_time, 10);
          const pingPreserveTime = parseInt(
            values.ping_record_preserve_time,
            10
          );
          if (isNaN(preserveTime) || isNaN(pingPreserveTime)) {
            setExpectedUsage("0");
            return;
          }
          setExpectedUsage(
            calculateExpectedUsage(pingPreserveTime, preserveTime)
          );
        }}
      >
        <label className="text-sm text-muted-foreground">
          {t("settings.record.expected_usage", {
            space: expected_usage,
          })}
        </label>
      </SettingCardMultiInputCollapse>
      <SettingCardLabel>{t("settings.nezha.title")}</SettingCardLabel>
      <label className="text-sm text-muted-foreground -mt-4">
        {t("settings.nezha.description")}
      </label>
      <SettingCardSwitch
        title={t("settings.nezha.enabled")}
        description={t("settings.nezha.enabled_description")}
        defaultChecked={settings.nezha_compat_enabled}
        onChange={async (checked) => {
          await updateSettingsWithToast({ nezha_compat_enabled: checked }, t);
        }}
      />
      <SettingCardShortTextInput
        title={t("settings.nezha.listen")}
        description={t("settings.nezha.listen_description")}
        defaultValue={settings.nezha_compat_listen || ""}
        placeholder="0.0.0.0:5555"
        OnSave={async (value) => {
          await updateSettingsWithToast({ nezha_compat_listen: value }, t);
        }}
      />
      <Dialog.Root open={showDisableDialog} onOpenChange={(open) => {
        if (!open) {
          if (disablePromise) disablePromise.reject();
          setShowDisableDialog(false);
          setSudoDisableCode("");
          setDisablePromise(null);
        }
      }}>
        <Dialog.Content>
          <Dialog.Title>{t("settings.sudo_2fa.disable_title", "关闭终端 Sudo 验证")}</Dialog.Title>
          <Dialog.Description>
            {t("settings.sudo_2fa.disable_desc", "为了安全起见，关闭此功能需要验证您的 6 位身份验证器动态码。")}
          </Dialog.Description>
          <Flex direction="column" gap="3" mt="4">
            <TextField.Root
              placeholder="000000"
              value={sudoDisableCode}
              onChange={(e) => setSudoDisableCode(e.target.value)}
              maxLength={6}
            />
            <Flex gap="3" justify="end">
              <Button variant="soft" color="gray" onClick={() => {
                if (disablePromise) disablePromise.reject();
                setShowDisableDialog(false);
                setSudoDisableCode("");
                setDisablePromise(null);
              }}>
                {t("common.cancel", "取消")}
              </Button>
              <Button disabled={verifying || sudoDisableCode.length !== 6} onClick={async () => {
                setVerifying(true);
                try {
                  const res = await fetch("/api/admin/settings", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-2FA-Code": sudoDisableCode
                    },
                    body: JSON.stringify({ sudo_2fa_required: false })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.message || data.error || "Failed to save");
                  toast.success(t("settings.settings_saved", "保存成功"));
                  if (disablePromise) disablePromise.resolve();
                  setShowDisableDialog(false);
                  setSudoDisableCode("");
                  setDisablePromise(null);
                } catch (e: any) {
                  toast.error(e.message);
                } finally {
                  setVerifying(false);
                }
              }}>
                {t("common.confirm", "确认")}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}

function calculateExpectedUsage(
  pingPreserveTime: number,
  recordPreserveTime: number
): string {
  let totalPingBytes = 0;
  let totalRecordBytes = 0;

  // 1 ping/minute * 60 bytes/ping * 60 minutes/hour = 3600 bytes/hour
  totalPingBytes = pingPreserveTime * 3600;

  if (recordPreserveTime <= 4) {
    // First 4 hours: 1 record/minute * 1024 bytes/record * 60 minutes/hour
    totalRecordBytes = recordPreserveTime * 1 * 1024 * 60;
  } else {
    // Bytes for the first 4 hours
    totalRecordBytes = 4 * 1 * 1024 * 60;
    // Bytes for the remaining time (recordPreserveTime - 4)
    // 4 records/hour * 1024 bytes/record
    totalRecordBytes += (recordPreserveTime - 4) * 4 * 1024;
  }

  return formatBytes(totalPingBytes + totalRecordBytes);
}

const ApiCard = ({ settings }: { settings: SettingsResponse }) => {
  //const { settings } = useSettings();
  const { t } = useTranslation();
  const [apiValues, setApiValues] = React.useState<string>(
    settings?.auto_discovery_key || ""
  );

  // 生成32位随机字符串
  const generateRandomString = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 处理生成按钮点击
  const handleGenerateApiKey = () => {
    const newApiKey = generateRandomString();
    setApiValues(newApiKey);
  };

  // 初始化API值
  React.useEffect(() => {
    if (settings?.auto_discovery_key) {
      setApiValues(settings.auto_discovery_key);
    }
  }, [settings?.auto_discovery_key]);

  return (
    <SettingCardShortTextInput
      title={t("settings.general.auto_discovery_key")}
      description={t("settings.general.auto_discovery_key_description")}
      value={apiValues}
      onChange={(e) => setApiValues(e.target.value)}
      OnSave={async (values) => {
        if (!values) {
          await updateSettingsWithToast({ auto_discovery_key: "" }, t);
          return;
        }
        if (values.length < 12) {
          toast.error(t("settings.api.key_length_error"));
          return;
        }
        await updateSettingsWithToast({ auto_discovery_key: values }, t);
      }}
    >
      <div className="flex flex-row gap-2 justify-start items-center">
        <Button variant="soft" color="green" onClick={handleGenerateApiKey}>
          {t("common.generate")}
        </Button>
        <Button
          variant="soft"
          color="mint"
          onClick={() => {
            window.open(
              "https://komari-document.pages.dev/install/agent-ad.html",
              "_blank"
            );
          }}
        >
          {t("common.help")}
        </Button>
      </div>
    </SettingCardShortTextInput>
  );
};
