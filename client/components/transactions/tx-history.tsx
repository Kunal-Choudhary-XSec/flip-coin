"use client";

import { CheckCircle2, ExternalLink, History, Loader2, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useTxStore } from "@/stores/tx-store";
import { explorerTxUrl } from "@/lib/config";
import { formatDateTime, shortAddress } from "@/lib/utils";
import type { TrackedTx, TxAction } from "@/types";

const ACTION_LABELS: Record<TxAction, string> = {
  create_room: "Create room",
  join_room: "Join room",
  resolve_room: "Flip coin",
  cancel_room: "Cancel room",
};

export function TxStatusBadge({ status }: { status: TrackedTx["status"] }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Pending
        </Badge>
      );
    case "success":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
  }
}

export function TxHistory() {
  const { transactions, clearHistory } = useTxStore();

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No transactions yet"
        description="Transactions you submit from this browser will be tracked here with live status updates."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={clearHistory}>
          <Trash2 className="h-4 w-4" />
          Clear history
        </Button>
      </div>
      <ul className="space-y-3">
        {transactions.map((tx) => (
          <li
            key={tx.hash}
            className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3.5"
          >
            <TxStatusBadge status={tx.status} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {ACTION_LABELS[tx.action]}
                {tx.roomId !== undefined && (
                  <span className="text-muted-foreground"> · room #{tx.roomId}</span>
                )}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {shortAddress(tx.hash, 10)} · {formatDateTime(tx.createdAt)}
              </p>
              {tx.error && (
                <p className="mt-1 text-xs text-destructive">{tx.error}</p>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={explorerTxUrl(tx.hash)} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Explorer
              </a>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
