"use client";

import { useQuery } from "@tanstack/react-query";
import { getHorizonServer } from "@/lib/stellar";
import { BALANCE_POLL_INTERVAL } from "@/lib/config";
import type { BalanceLine } from "@/types";

/** Fetch account balances from Horizon, polling for live updates. */
export function useBalance(address: string | null) {
  return useQuery({
    queryKey: ["balance", address],
    enabled: !!address,
    refetchInterval: BALANCE_POLL_INTERVAL,
    retry: 1,
    queryFn: async (): Promise<{ balances: BalanceLine[]; exists: boolean }> => {
      try {
        const account = await getHorizonServer()
          .accounts()
          .accountId(address!)
          .call();
        const balances: BalanceLine[] = account.balances.map((b) => ({
          asset:
            b.asset_type === "native"
              ? "XLM"
              : "asset_code" in b
                ? (b.asset_code as string)
                : b.asset_type,
          balance: b.balance,
        }));
        return { balances, exists: true };
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          return { balances: [], exists: false };
        }
        throw err;
      }
    },
  });
}
