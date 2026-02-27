import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { ERC20_TOKEN_ADDRESS } from "../lib/contract";

export type DemoHealthStatus = "checking" | "healthy" | "dead" | "dismissed";

export function useDemoHealth(): {
  status: DemoHealthStatus;
  dismiss: () => void;
  recheck: () => void;
} {
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<DemoHealthStatus>("checking");

  const check = useCallback(async () => {
    if (!publicClient) return;
    try {
      setStatus("checking");
      const code = await publicClient.getBytecode({ address: ERC20_TOKEN_ADDRESS });
      setStatus(code && code !== "0x" ? "healthy" : "dead");
    } catch {
      setStatus("dead");
    }
  }, [publicClient]);

  useEffect(() => {
    check();
  }, [check]);

  return {
    status,
    dismiss: () => setStatus("dismissed"),
    recheck: check,
  };
}
