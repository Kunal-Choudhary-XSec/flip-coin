/** Coin sides — mirrors the contract's u32 encoding. */
export enum CoinSide {
  Heads = 0,
  Tails = 1,
}

/** Room lifecycle — mirrors the contract's RoomStatus enum. */
export type RoomStatus = "Open" | "Matched" | "Resolved" | "Cancelled";

/** A game room as returned by the contract (after scValToNative + normalization). */
export interface Room {
  id: bigint;
  creator: string;
  creatorSide: CoinSide;
  opponent: string | null;
  /** Entry fee per player, in stroops. */
  entryFee: bigint;
  /** Unix seconds. */
  createdAt: number;
  /** Unix seconds — 10s entry window ends at this time (0 while open). */
  entryDeadline: number;
  /** Unix seconds — flip can be resolved at this time (0 while open). */
  resolveAt: number;
  status: RoomStatus;
  winner: string | null;
  result: CoinSide | null;
}

/**
 * Derived, UI-friendly room state.
 * The countdown only starts once an opponent joins:
 * Open (no timer) → entry-window (10s) → waiting-flip (5s) → flippable.
 */
export type RoomUiState =
  | "joinable" // Open — waiting for an opponent, no countdown
  | "entry-window" // Matched — 10s entry countdown running
  | "waiting-flip" // Matched — 5s flip countdown running
  | "flippable" // Matched — countdown finished, flip can be resolved
  | "resolved"
  | "cancelled";

/** Contract event types emitted by the CoinFlip contract. */
export type GameEventType = "created" | "joined" | "resolved" | "cancelled";

/** A parsed contract event for the activity feed. */
export interface GameEvent {
  id: string;
  type: GameEventType;
  roomId: bigint;
  /** Wallet address that performed the action. */
  address: string;
  /** Amount in stroops relevant to the event (fee or pot). */
  amount: bigint | null;
  /** Flip result for "resolved" events. */
  result: CoinSide | null;
  txHash: string;
  ledger: number;
  /** Unix milliseconds. */
  timestamp: number;
}

/** Local transaction tracking status. */
export type TxStatus = "pending" | "success" | "failed";

/** Which contract function a tracked transaction invoked. */
export type TxAction = "create_room" | "join_room" | "resolve_room" | "cancel_room";

/** A locally tracked transaction (persisted in Zustand). */
export interface TrackedTx {
  hash: string;
  action: TxAction;
  status: TxStatus;
  address: string;
  roomId?: string;
  /** Unix milliseconds. */
  createdAt: number;
  error?: string;
}

/** Wallet balance line for the dashboard. */
export interface BalanceLine {
  asset: string;
  balance: string;
}
