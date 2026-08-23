"use client";

import { AlertCircle } from "lucide-react";
import { isContractConfigured } from "@/lib/config";

/** Warns when NEXT_PUBLIC_COINFLIP_CONTRACT_ID hasn't been configured yet. */
export function ContractBanner() {
  if (isContractConfigured()) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="container flex items-center gap-2 py-2 text-sm text-amber-700 dark:text-amber-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          Contract not configured. Run <code className="rounded bg-muted px-1 font-mono">bash script/deploy.sh</code>{" "}
          and set <code className="rounded bg-muted px-1 font-mono">NEXT_PUBLIC_COINFLIP_CONTRACT_ID</code> in{" "}
          <code className="rounded bg-muted px-1 font-mono">client/.env.local</code>.
        </span>
      </div>
    </div>
  );
}
