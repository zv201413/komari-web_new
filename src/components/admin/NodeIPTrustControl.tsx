import { useRef, useState } from "react";
import { Button, Dialog, Flex, Switch, Text, TextField } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAccount } from "@/contexts/AccountContext";
import { useNodeIPTrust } from "@/contexts/NodeIPTrustContext";

export function NodeIPTrustControl() {
  const { t } = useTranslation();
  const { account } = useAccount();
  const { enabled, unlocked, loading, applyPolicy } = useNodeIPTrust();
  const [open, setOpen] = useState(false);
  const [nextEnabled, setNextEnabled] = useState(true);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const needsOTP = Boolean(account?.["2fa_enabled"]);
  function request(next: boolean) { setNextEnabled(next); setCode(""); setOpen(true); }
  async function save() {
    if (inFlight.current || (needsOTP && !code.trim())) return;
    inFlight.current = true; setSaving(true);
    try {
      const response = await fetch("/api/admin/client/ip-trust-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(needsOTP ? { "X-2FA-Code": code } : {}) },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error(data.message || t("common.error"));
      applyPolicy({ enabled: data.data.enabled === true, unlocked: data.data.unlocked === true });
      setOpen(false); setCode("");
      toast.success(t("admin.nodeEdit.saveSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally { inFlight.current = false; setSaving(false); }
  }
  return (
    <Flex direction="column" gap="1">
      <Flex align="center" gap="3" wrap="wrap">
        <Text as="label" htmlFor="node-ip-trust-master" size="2">{t("admin.nodeTable.ipTrustMaster")}</Text>
        <Switch id="node-ip-trust-master" checked={enabled} disabled={loading || saving} onCheckedChange={request} aria-label={t("admin.nodeTable.ipTrustMaster")} />
        {enabled && !unlocked && <Button size="1" variant="soft" disabled={loading || saving} onClick={() => request(true)}>{t("admin.nodeTable.ipTrustUnlock")}</Button>}
        {enabled && unlocked && <Text size="1" color="gray">{t("admin.nodeTable.ipTrustUnlocked")}</Text>}
      </Flex>
      <Text size="1" color="gray">{t("admin.nodeTable.ipTrustMasterTip")}</Text>
      <Dialog.Root open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
        <Dialog.Content style={{ maxWidth: 480 }}>
          <Dialog.Title>{t("admin.nodeTable.ipTrustMaster")}</Dialog.Title>
          <Dialog.Description>{t(nextEnabled ? "admin.nodeTable.trustLoginIPWarning" : "admin.nodeTable.ipTrustDisableWarning")}</Dialog.Description>
          <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <Flex direction="column" gap="3" mt="3">
              {needsOTP && <label>
                <Text size="2" as="div" mb="1">{t("account.2fa_otp_input_prompt")}</Text>
                <TextField.Root value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" placeholder="000000" disabled={saving} />
              </label>}
              <Flex justify="end" gap="2">
                <Dialog.Close><Button type="button" variant="soft" disabled={saving}>{t("common.cancel")}</Button></Dialog.Close>
                <Button data-enter-submit type="submit" disabled={saving || (needsOTP && !code.trim())}>{t("common.confirm")}</Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
