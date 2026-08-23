"use client";

import { Loader2, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/hooks/use-wallet";
import { shortAddress } from "@/lib/utils";
import { explorerAccountUrl } from "@/lib/config";
import { toast } from "sonner";

export function ConnectWalletButton() {
  const { address, walletName, connected, connecting, connect, disconnect } = useWallet();

  if (!connected) {
    return (
      <Button onClick={connect} disabled={connecting}>
        {connecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {connecting ? "Connecting…" : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-mono">{shortAddress(address!)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {walletName ?? "Wallet"}
        </div>
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(address!);
            toast.success("Address copied to clipboard");
          }}
        >
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(explorerAccountUrl(address!), "_blank")}
        >
          View on explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="text-destructive">
          <LogOut className="h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
