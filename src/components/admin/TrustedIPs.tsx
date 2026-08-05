import { Button, Dialog, Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import { Trash2 } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAccount } from "@/contexts/AccountContext";
import { SettingCardLabel } from "@/components/admin/SettingCard";

/**
 * IP 白名单管理。白名单内的 IP 登录时免输 2FA 动态码，
 * 但增删白名单本身强制 2FA（后端 RequireSensitive2FA 中间件）。
 * 终端仍走 sudo_token，不受白名单影响。
 */
export default function TrustedIPs() {
  const { t } = useTranslation();
  const { account } = useAccount();
  const [ips, setIps] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // 2FA 弹窗：add / remove 共用，pendingIP 为空表示走 add 分支
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "remove">("add");
  const [pendingIP, setPendingIP] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newIP, setNewIP] = React.useState("");

  const twoFAEnabled = Boolean(account?.["2fa_enabled"]);

  const loadIPs = React.useCallback(() => {
    setLoading(true);
    fetch("/api/admin/trusted-ips")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setIps(data.data?.trusted_ips ?? []);
        } else {
          toast.error(data.message || t("settings.trusted_ips.load_failed"));
        }
      })
      .catch(() => toast.error(t("settings.trusted_ips.load_failed")))
      .finally(() => setLoading(false));
  }, [t]);

  React.useEffect(() => {
    loadIPs();
  }, [loadIPs]);

  // 未启用 2FA 时后端直接放行，无需弹窗收集动态码
  const submit = (targetMode: "add" | "remove", ip: string, code: string) => {
    if (!ip) {
      toast.error(t("settings.trusted_ips.ip_required"));
      return;
    }
    setSaving(true);
    fetch(`/api/admin/trusted-ips/${targetMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, "2fa_code": code }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.status !== "success") {
          throw new Error(data.message || t("common.error"));
        }
        return data;
      })
      .then(() => {
        toast.success(
          targetMode === "add"
            ? t("settings.trusted_ips.add_success")
            : t("settings.trusted_ips.remove_success"),
        );
        setDialogOpen(false);
        setOtp("");
        setNewIP("");
        setPendingIP("");
        loadIPs();
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setSaving(false));
  };

  const request = (targetMode: "add" | "remove", ip: string) => {
    if (twoFAEnabled) {
      setMode(targetMode);
      setPendingIP(ip);
      setDialogOpen(true);
      return;
    }
    submit(targetMode, ip, "");
  };

  return (
    <Flex direction="column" gap="2" className="w-full">
      <SettingCardLabel>{t("settings.trusted_ips.title")}</SettingCardLabel>
      <Text size="2" color="gray">
        {t("settings.trusted_ips.description")}
      </Text>

      <Flex gap="2" align="center" wrap="wrap" className="mt-2">
        <TextField.Root
          placeholder={t("settings.trusted_ips.placeholder")}
          value={newIP}
          onChange={(e) => setNewIP(e.target.value)}
          className="flex-1 min-w-[220px]"
        />
        <Button
          disabled={saving || !newIP.trim()}
          onClick={() => request("add", newIP.trim())}
        >
          {t("settings.trusted_ips.add")}
        </Button>
      </Flex>

      <Flex direction="column" gap="1" className="mt-2">
        {loading ? (
          <Text size="2" color="gray">
            {t("common.loading")}
          </Text>
        ) : ips.length === 0 ? (
          <Text size="2" color="gray">
            {t("settings.trusted_ips.empty")}
          </Text>
        ) : (
          ips.map((ip) => (
            <Flex
              key={ip}
              justify="between"
              align="center"
              className="border-1 rounded-md py-2 px-4 min-h-8"
              style={{ borderColor: "var(--gray-a5)" }}
            >
              <Text size="2">{ip}</Text>
              <IconButton
                variant="soft"
                color="red"
                disabled={saving}
                onClick={() => request("remove", ip)}
              >
                <Trash2 size={16} />
              </IconButton>
            </Flex>
          ))
        )}
      </Flex>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content style={{ maxWidth: 420 }}>
          <Dialog.Title>
            {mode === "add"
              ? t("settings.trusted_ips.add")
              : t("settings.trusted_ips.remove")}
          </Dialog.Title>
          <Flex direction="column" gap="3">
            <Text size="2">
              {t("settings.trusted_ips.confirm_target", {
                ip: mode === "add" ? newIP.trim() : pendingIP,
              })}
            </Text>
            <label>
              <Text size="2" mb="1" as="div">
                {t("account.2fa_otp_input_prompt")}
              </Text>
              <TextField.Root
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </label>
            <Flex gap="2" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  {t("common.cancel")}
                </Button>
              </Dialog.Close>
              <Button
                disabled={saving || !otp}
                onClick={() =>
                  submit(mode, mode === "add" ? newIP.trim() : pendingIP, otp)
                }
              >
                {t("common.confirm")}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
