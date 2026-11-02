import { useEffect, useRef, useState } from "react";
import { Switch, Tooltip } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNodeDetails, type NodeDetail } from "@/contexts/NodeDetailsContext";
import { useNodeIPTrust } from "@/contexts/NodeIPTrustContext";

export function TrustLoginIPCell({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const { refresh, updateNode } = useNodeDetails();
  const policy = useNodeIPTrust();
  const [enabled, setEnabled] = useState(node.trust_login_ip ?? false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const eligible = node.ip_trust_eligible === true;
  useEffect(() => setEnabled(node.trust_login_ip ?? false), [node.trust_login_ip]);
  async function save(next: boolean) {
    if (inFlight.current || (next && (!eligible || !policy.enabled || !policy.unlocked))) return;
    inFlight.current = true; setSaving(true);
    try {
      const response = await fetch(`/api/admin/client/${encodeURIComponent(node.uuid)}/trust-login-ip`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: next }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error(data.message || t("common.error"));
      setEnabled(next); updateNode(node.uuid, { trust_login_ip: next });
      toast.success(t("admin.nodeEdit.saveSuccess"));
      void refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
      void policy.refreshPolicy();
    } finally { inFlight.current = false; setSaving(false); }
  }
  return (
    <Tooltip content={t(eligible ? "admin.nodeTable.trustLoginIPTip" : node.connection_source_ip ? "admin.nodeTable.connectionMismatchTip" : "admin.nodeTable.connectionUnverifiedTip", { ip: node.connection_source_ip })}>
      <span className="inline-flex flex-col gap-1">
        <Switch checked={enabled} disabled={saving || policy.loading || (!enabled && (!eligible || !policy.enabled || !policy.unlocked))}
          aria-label={t("admin.nodeTable.trustLoginIPLabel", { name: node.name })} onCheckedChange={(next) => { void save(next); }} />
        {enabled && !eligible && <span className="text-xs text-amber-600 dark:text-amber-400">{t("admin.nodeTable.trustSuspended")}</span>}
      </span>
    </Tooltip>
  );
}
