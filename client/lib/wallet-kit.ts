import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { CONFIG } from "@/lib/config";

let kit: StellarWalletsKit | null = null;

/**
 * Lazily create the StellarWalletsKit singleton.
 * Must only be called in the browser (the kit touches `window`).
 */
export function getWalletKit(): StellarWalletsKit {
  if (typeof window === "undefined") {
    throw new Error("StellarWalletsKit is only available in the browser");
  }
  if (!kit) {
    kit = new StellarWalletsKit({
      network:
        CONFIG.network === "PUBLIC"
          ? WalletNetwork.PUBLIC
          : WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kit;
}

/**
 * Open the built-in multi-wallet selection modal and resolve with the
 * selected wallet id + address, or null if the user closed the modal.
 */
export async function openWalletModal(): Promise<{
  walletId: string;
  walletName: string;
  address: string;
} | null> {
  const kit = getWalletKit();

  return new Promise((resolve, reject) => {
    let settled = false;
    kit
      .openModal({
        modalTitle: "Connect a Stellar wallet",
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();
            settled = true;
            resolve({ walletId: option.id, walletName: option.name, address });
          } catch (err) {
            settled = true;
            reject(err);
          }
        },
        onClosed: () => {
          if (!settled) resolve(null);
        },
      })
      .catch(reject);
  });
}

/** Restore a previously selected wallet (e.g. after a page reload). */
export async function restoreWallet(walletId: string): Promise<string | null> {
  try {
    const kit = getWalletKit();
    kit.setWallet(walletId);
    const { address } = await kit.getAddress();
    return address;
  } catch {
    return null;
  }
}

/** Sign a transaction XDR with the currently selected wallet. */
export async function signWithWallet(
  xdr: string,
  address: string,
  networkPassphrase: string,
): Promise<string> {
  const kit = getWalletKit();
  const { signedTxXdr } = await kit.signTransaction(xdr, {
    address,
    networkPassphrase,
  });
  return signedTxXdr;
}

/** Disconnect the current wallet session. */
export async function disconnectWallet(): Promise<void> {
  try {
    await getWalletKit().disconnect();
  } catch {
    // some wallet modules don't implement disconnect — safe to ignore
  }
}
