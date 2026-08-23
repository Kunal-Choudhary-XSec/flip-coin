import type { Metadata } from "next";
import { WalletDashboard } from "@/components/wallet/wallet-dashboard";

export const metadata: Metadata = {
  title: "Wallet Dashboard — Stellar CoinFlip",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your connected address, live balances, and network configuration.
        </p>
      </div>
      <WalletDashboard />
    </div>
  );
}
