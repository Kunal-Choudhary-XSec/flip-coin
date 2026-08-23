"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cancelRoom, createRoom, joinRoom, resolveRoom } from "@/lib/contract";
import { toUserError } from "@/lib/errors";
import { explorerTxUrl } from "@/lib/config";
import { useTxStore } from "@/stores/tx-store";
import { useWalletStore } from "@/stores/wallet-store";
import type { CoinSide, TxAction } from "@/types";

/**
 * Game mutations with full transaction tracking:
 * - records pending tx in the persisted tx store as soon as it's submitted
 * - updates to success/failed once confirmed
 * - fires toasts with explorer links
 * - invalidates room/event/balance queries for instant UI refresh
 */
export function useGameActions() {
  const queryClient = useQueryClient();
  const { addTx, updateTx } = useTxStore();
  const address = useWalletStore((s) => s.address);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["room"] });
    queryClient.invalidateQueries({ queryKey: ["game-events"] });
    queryClient.invalidateQueries({ queryKey: ["balance"] });
  };

  const track = (action: TxAction, roomId?: string) => {
    let trackedHash: string | null = null;
    return {
      onSubmitted: (hash: string) => {
        trackedHash = hash;
        addTx({
          hash,
          action,
          status: "pending",
          address: address ?? "",
          roomId,
          createdAt: Date.now(),
        });
        toast.loading("Transaction submitted…", {
          id: hash,
          description: `${hash.slice(0, 10)}…`,
        });
      },
      onConfirmed: (hash: string, message: string) => {
        updateTx(hash, { status: "success" });
        toast.success(message, {
          id: hash,
          description: `${hash.slice(0, 10)}…`,
          action: {
            label: "Explorer",
            onClick: () => window.open(explorerTxUrl(hash), "_blank"),
          },
        });
      },
      onFailed: (err: unknown) => {
        const message = toUserError(err);
        if (trackedHash) {
          updateTx(trackedHash, { status: "failed", error: message });
          toast.error("Transaction failed", { id: trackedHash, description: message });
        } else {
          toast.error("Transaction failed", { description: message });
        }
      },
    };
  };

  const requireAddress = (): string => {
    if (!address) throw new Error("Wallet not found. Connect your wallet first.");
    return address;
  };

  const create = useMutation({
    mutationFn: async (vars: { entryFeeStroops: bigint; side: CoinSide }) => {
      const addr = requireAddress();
      const t = track("create_room");
      try {
        const res = await createRoom(addr, vars.entryFeeStroops, vars.side, t.onSubmitted);
        t.onConfirmed(res.hash, "Room created! Waiting for an opponent…");
        return res;
      } catch (err) {
        t.onFailed(err);
        throw err;
      }
    },
    onSettled: invalidate,
  });

  const join = useMutation({
    mutationFn: async (vars: { roomId: bigint }) => {
      const addr = requireAddress();
      const t = track("join_room", vars.roomId.toString());
      try {
        const res = await joinRoom(vars.roomId, addr, t.onSubmitted);
        t.onConfirmed(res.hash, "You're in! Countdown started — flip in 15 seconds…");
        return res;
      } catch (err) {
        t.onFailed(err);
        throw err;
      }
    },
    onSettled: invalidate,
  });

  const resolve = useMutation({
    mutationFn: async (vars: { roomId: bigint }) => {
      const addr = requireAddress();
      const t = track("resolve_room", vars.roomId.toString());
      try {
        const res = await resolveRoom(vars.roomId, addr, t.onSubmitted);
        const winner = res.returnValue as string;
        t.onConfirmed(
          res.hash,
          winner === addr ? "🎉 You won the flip!" : "Coin flipped — winner paid out.",
        );
        return res;
      } catch (err) {
        t.onFailed(err);
        throw err;
      }
    },
    onSettled: invalidate,
  });

  const cancel = useMutation({
    mutationFn: async (vars: { roomId: bigint }) => {
      const addr = requireAddress();
      const t = track("cancel_room", vars.roomId.toString());
      try {
        const res = await cancelRoom(vars.roomId, addr, t.onSubmitted);
        t.onConfirmed(res.hash, "Room cancelled — entry fee refunded.");
        return res;
      } catch (err) {
        t.onFailed(err);
        throw err;
      }
    },
    onSettled: invalidate,
  });

  return { create, join, resolve, cancel };
}
