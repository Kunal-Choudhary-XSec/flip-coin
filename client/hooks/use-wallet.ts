"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useWalletStore } from "@/stores/wallet-store";
import {
  disconnectWallet,
  openWalletModal,
  restoreWallet,
} from "@/lib/wallet-kit";
import { toUserError } from "@/lib/errors";

/**
 * Wallet connection state + actions. Restores the previous session on mount
 * and exposes connect/disconnect built on StellarWalletsKit's modal.
 */
export function useWallet() {
  const { address, walletId, walletName, connecting, setConnecting, setWallet, clearWallet } =
    useWalletStore();
  const restored = useRef(false);

  // Restore a persisted session once on mount.
  useEffect(() => {
    if (restored.current || !walletId || address === null) return;
    restored.current = true;
    restoreWallet(walletId).then((restoredAddress) => {
      if (!restoredAddress) {
        clearWallet();
      } else if (restoredAddress !== address) {
        setWallet({
          address: restoredAddress,
          walletId,
          walletName: walletName ?? walletId,
        });
      }
    });
  }, [walletId, address, walletName, setWallet, clearWallet]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await openWalletModal();
      if (result) {
        setWallet(result);
        toast.success("Wallet connected", {
          description: `${result.walletName} · ${result.address.slice(0, 8)}…`,
        });
      }
    } catch (err) {
      toast.error("Failed to connect wallet", { description: toUserError(err) });
    } finally {
      setConnecting(false);
    }
  }, [setConnecting, setWallet]);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    clearWallet();
    toast.info("Wallet disconnected");
  }, [clearWallet]);

  return {
    address,
    walletName,
    connected: !!address,
    connecting,
    connect,
    disconnect,
  };
}
