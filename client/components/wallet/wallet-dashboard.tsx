"use client";

import { Copy, ExternalLink, Globe, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useBalance } from "@/hooks/use-balance";
import { useWallet } from "@/hooks/use-wallet";
import { CONFIG, explorerAccountUrl, explorerContractUrl, isContractConfigured } from "@/lib/config";

export function WalletDashboard() {
  const { address, walletName, connected, connect } = useWallet();
  const balanceQuery = useBalance(address);

  if (!connected) {
    return (
      <EmptyState
        icon={WalletIcon}
        title="No wallet connected"
        description="Connect a Stellar wallet to see your address, balances, and network details."
        action={<Button onClick={connect}>Connect Wallet</Button>}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4" />
            Wallet
          </CardTitle>
          <CardDescription>{walletName ?? "Connected wallet"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
              {address}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(address!);
                toast.success("Address copied");
              }}
              aria-label="Copy address"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" asChild aria-label="View on explorer">
              <a href={explorerAccountUrl(address!)} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">Balances</p>
            {balanceQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ) : balanceQuery.isError ? (
              <ErrorState error={balanceQuery.error} onRetry={() => balanceQuery.refetch()} />
            ) : balanceQuery.data && !balanceQuery.data.exists ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <p>This account isn&apos;t funded on {CONFIG.network.toLowerCase()} yet.</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a
                    href={`https://friendbot.stellar.org/?addr=${address}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fund with Friendbot
                  </a>
                </Button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {balanceQuery.data?.balances.map((b) => (
                  <li
                    key={b.asset}
                    className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{b.asset}</span>
                    <span className="font-mono">{b.balance}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Network
          </CardTitle>
          <CardDescription>Connection & contract details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Network</span>
            <Badge variant="secondary">{CONFIG.network}</Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Soroban RPC</span>
            <code className="truncate font-mono text-xs">{CONFIG.rpcUrl}</code>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Horizon</span>
            <code className="truncate font-mono text-xs">{CONFIG.horizonUrl}</code>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <span className="text-muted-foreground">CoinFlip contract</span>
            {isContractConfigured() ? (
              <a
                href={explorerContractUrl(CONFIG.contractId)}
                target="_blank"
                rel="noreferrer"
                className="block truncate font-mono text-xs hover:underline"
              >
                {CONFIG.contractId}
              </a>
            ) : (
              <Badge variant="destructive">Not configured</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
