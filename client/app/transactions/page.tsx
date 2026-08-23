import type { Metadata } from "next";
import { TxHistory } from "@/components/transactions/tx-history";

export const metadata: Metadata = {
  title: "Transactions — Stellar CoinFlip",
};

export default function TransactionsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transaction history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Transactions you&apos;ve submitted from this browser, with live
          pending / success / failed status and explorer links.
        </p>
      </div>
      <TxHistory />
    </div>
  );
}
