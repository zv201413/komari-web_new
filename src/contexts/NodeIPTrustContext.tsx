import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Policy = { enabled: boolean; unlocked: boolean };
type PolicyContext = Policy & { loading: boolean; refreshPolicy: () => Promise<void>; applyPolicy: (policy: Policy) => void };
const Context = createContext<PolicyContext | null>(null);

export function NodeIPTrustProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicy] = useState<Policy>({ enabled: false, unlocked: false });
  const [loading, setLoading] = useState(true);
  const refreshPolicy = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/client/ip-trust-policy", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error("Cannot load IP trust policy");
      setPolicy({ enabled: data.data.enabled === true, unlocked: data.data.unlocked === true });
    } catch {
      setPolicy({ enabled: false, unlocked: false });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refreshPolicy();
    const refreshOnFocus = () => { void refreshPolicy(); };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [refreshPolicy]);
  return <Context.Provider value={{ ...policy, loading, refreshPolicy, applyPolicy: setPolicy }}>{children}</Context.Provider>;
}

export function useNodeIPTrust() {
  const value = useContext(Context);
  if (!value) throw new Error("NodeIPTrustProvider is required");
  return value;
}
