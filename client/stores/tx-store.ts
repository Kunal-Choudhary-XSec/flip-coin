import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TrackedTx, TxStatus } from "@/types";

const MAX_TRACKED = 100;

interface TxState {
  transactions: TrackedTx[];
  addTx: (tx: TrackedTx) => void;
  updateTx: (hash: string, patch: { status: TxStatus; error?: string }) => void;
  clearHistory: () => void;
}

export const useTxStore = create<TxState>()(
  persist(
    (set) => ({
      transactions: [],
      addTx: (tx) =>
        set((s) => ({
          transactions: [tx, ...s.transactions].slice(0, MAX_TRACKED),
        })),
      updateTx: (hash, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.hash === hash ? { ...t, ...patch } : t,
          ),
        })),
      clearHistory: () => set({ transactions: [] }),
    }),
    { name: "coinflip-transactions" },
  ),
);
