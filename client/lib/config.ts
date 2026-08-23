import { Networks } from "@stellar/stellar-sdk";

export const CONFIG = {
  /** Deployed CoinFlip contract ID. */
  contractId:
    process.env.NEXT_PUBLIC_COINFLIP_CONTRACT_ID ?? "CONTRACT_ADDRESS_HERE",
  network: (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET") as
    | "TESTNET"
    | "PUBLIC",
  rpcUrl:
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
    "https://soroban-testnet.stellar.org",
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  nativeTokenContractId:
    process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT_ID ??
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  explorerUrl:
    process.env.NEXT_PUBLIC_EXPLORER_URL ??
    "https://stellar.expert/explorer/testnet",
} as const;

export const NETWORK_PASSPHRASE =
  CONFIG.network === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;

/**
 * Game timing (must match the contract constants).
 * The countdown starts when an opponent JOINS a room:
 * 10s entry window, then 5s until the coin flip.
 */
export const ENTRY_WINDOW_SECS = 10;
export const RESOLVE_DELAY_SECS = 5;

/** Polling intervals (ms). */
export const ROOMS_POLL_INTERVAL = 3_000;
export const EVENTS_POLL_INTERVAL = 4_000;
export const BALANCE_POLL_INTERVAL = 15_000;

export const isContractConfigured = () =>
  CONFIG.contractId.startsWith("C") && CONFIG.contractId.length === 56;

export const explorerTxUrl = (hash: string) => `${CONFIG.explorerUrl}/tx/${hash}`;
export const explorerAccountUrl = (address: string) =>
  `${CONFIG.explorerUrl}/account/${address}`;
export const explorerContractUrl = (contractId: string) =>
  `${CONFIG.explorerUrl}/contract/${contractId}`;
