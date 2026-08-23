import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletState {
  address: string | null;
  walletId: string | null;
  walletName: string | null;
  connecting: boolean;
  setConnecting: (connecting: boolean) => void;
  setWallet: (wallet: { address: string; walletId: string; walletName: string }) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      walletId: null,
      walletName: null,
      connecting: false,
      setConnecting: (connecting) => set({ connecting }),
      setWallet: ({ address, walletId, walletName }) =>
        set({ address, walletId, walletName, connecting: false }),
      clearWallet: () =>
        set({ address: null, walletId: null, walletName: null, connecting: false }),
    }),
    {
      name: "coinflip-wallet",
      partialize: (s) => ({
        address: s.address,
        walletId: s.walletId,
        walletName: s.walletName,
      }),
    },
  ),
);
