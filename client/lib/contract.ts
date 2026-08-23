import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { CONFIG, NETWORK_PASSPHRASE } from "@/lib/config";
import { getRpcServer, waitForTransaction } from "@/lib/stellar";
import { signWithWallet } from "@/lib/wallet-kit";
import type { CoinSide, GameEvent, GameEventType, Room, RoomStatus } from "@/types";

/**
 * A valid-but-nonexistent account used as the source for read-only
 * simulations, so reads work even without a connected wallet.
 */
const SIMULATION_ACCOUNT =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function contract(): Contract {
  return new Contract(CONFIG.contractId);
}

// ---------------------------------------------------------------------------
// Read (simulation-only) calls
// ---------------------------------------------------------------------------

async function simulateRead<T>(method: string, args: xdr.ScVal[]): Promise<T> {
  const server = getRpcServer();
  const source = new Account(SIMULATION_ACCOUNT, "0");
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract().call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  if (!sim.result?.retval) {
    throw new Error(`No return value from ${method}`);
  }
  return scValToNative(sim.result.retval) as T;
}

/** Raw room shape as returned by scValToNative for the contract struct. */
interface RawRoom {
  id: bigint;
  creator: string;
  creator_side: number;
  opponent: string | undefined | null;
  entry_fee: bigint;
  created_at: bigint;
  entry_deadline: bigint;
  resolve_at: bigint;
  status: unknown;
  winner: string | undefined | null;
  result: number | undefined | null;
}

function normalizeStatus(status: unknown): RoomStatus {
  // Unit enum variants come back as [variantName] or as a string.
  if (Array.isArray(status)) return String(status[0]) as RoomStatus;
  if (typeof status === "string") return status as RoomStatus;
  if (status && typeof status === "object") {
    const tag = (status as { tag?: string }).tag;
    if (tag) return tag as RoomStatus;
  }
  return "Open";
}

function normalizeRoom(raw: RawRoom): Room {
  return {
    id: BigInt(raw.id),
    creator: raw.creator,
    creatorSide: Number(raw.creator_side) as CoinSide,
    opponent: raw.opponent ?? null,
    entryFee: BigInt(raw.entry_fee),
    createdAt: Number(raw.created_at),
    entryDeadline: Number(raw.entry_deadline),
    resolveAt: Number(raw.resolve_at),
    status: normalizeStatus(raw.status),
    winner: raw.winner ?? null,
    result: raw.result === null || raw.result === undefined ? null : (Number(raw.result) as CoinSide),
  };
}

export async function fetchRoom(roomId: bigint): Promise<Room> {
  const raw = await simulateRead<RawRoom>("get_room", [
    nativeToScVal(roomId, { type: "u64" }),
  ]);
  return normalizeRoom(raw);
}

export async function fetchRooms(offset = 0n, limit = 50): Promise<Room[]> {
  const raw = await simulateRead<RawRoom[]>("get_rooms", [
    nativeToScVal(offset, { type: "u64" }),
    nativeToScVal(limit, { type: "u32" }),
  ]);
  return raw.map(normalizeRoom);
}

export async function fetchRoomCount(): Promise<bigint> {
  return simulateRead<bigint>("get_room_count", []);
}

// ---------------------------------------------------------------------------
// Write (signed) calls
// ---------------------------------------------------------------------------

export interface SubmitResult {
  hash: string;
  /** Native return value of the contract call, if any. */
  returnValue: unknown;
}

async function invokeSigned(
  method: string,
  args: xdr.ScVal[],
  signerAddress: string,
  onSubmitted?: (hash: string) => void,
): Promise<SubmitResult> {
  const server = getRpcServer();
  const account = await server.getAccount(signerAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract().call(method, ...args))
    .setTimeout(120)
    .build();

  // Simulate first: surfaces contract errors early and computes footprint/fees.
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  const signedXdr = await signWithWallet(
    prepared.toXDR(),
    signerAddress,
    NETWORK_PASSPHRASE,
  );
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sent = await server.sendTransaction(signedTx);
  if (sent.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${JSON.stringify(sent.errorResult ?? sent.status)}`,
    );
  }

  onSubmitted?.(sent.hash);

  const confirmed = await waitForTransaction(sent.hash);
  if (confirmed.status === "FAILED") {
    throw new Error("Transaction failed on-chain");
  }

  // Prefer the actual on-chain return value (matters for resolve_room, where
  // the PRNG outcome at execution can differ from the simulation). Fall back
  // to the simulated retval if the RPC response doesn't include it.
  let returnValue: unknown = null;
  if (confirmed.returnValueXdr) {
    try {
      returnValue = scValToNative(
        xdr.ScVal.fromXDR(confirmed.returnValueXdr, "base64"),
      );
    } catch {
      returnValue = null;
    }
  }
  if (returnValue === null && sim.result?.retval) {
    returnValue = scValToNative(sim.result.retval);
  }

  return { hash: sent.hash, returnValue };
}

export async function createRoom(
  creator: string,
  entryFeeStroops: bigint,
  side: CoinSide,
  onSubmitted?: (hash: string) => void,
): Promise<SubmitResult> {
  return invokeSigned(
    "create_room",
    [
      new Address(creator).toScVal(),
      nativeToScVal(entryFeeStroops, { type: "i128" }),
      nativeToScVal(side, { type: "u32" }),
    ],
    creator,
    onSubmitted,
  );
}

export async function joinRoom(
  roomId: bigint,
  opponent: string,
  onSubmitted?: (hash: string) => void,
): Promise<SubmitResult> {
  return invokeSigned(
    "join_room",
    [nativeToScVal(roomId, { type: "u64" }), new Address(opponent).toScVal()],
    opponent,
    onSubmitted,
  );
}

export async function resolveRoom(
  roomId: bigint,
  caller: string,
  onSubmitted?: (hash: string) => void,
): Promise<SubmitResult> {
  return invokeSigned(
    "resolve_room",
    [nativeToScVal(roomId, { type: "u64" })],
    caller,
    onSubmitted,
  );
}

export async function cancelRoom(
  roomId: bigint,
  caller: string,
  onSubmitted?: (hash: string) => void,
): Promise<SubmitResult> {
  return invokeSigned(
    "cancel_room",
    [nativeToScVal(roomId, { type: "u64" }), new Address(caller).toScVal()],
    caller,
    onSubmitted,
  );
}

// ---------------------------------------------------------------------------
// Contract events (activity feed)
// ---------------------------------------------------------------------------

const EVENT_TYPES: GameEventType[] = ["created", "joined", "resolved", "cancelled"];

/**
 * Fetch recent CoinFlip contract events via Soroban RPC `getEvents`.
 * Events power the real-time activity feed (polled by TanStack Query).
 */
export async function fetchGameEvents(limit = 100): Promise<GameEvent[]> {
  const server = getRpcServer();
  const latest = await server.getLatestLedger();
  // RPC retains ~24h of events on testnet (17,280 ledgers at ~5s each).
  const startLedger = Math.max(latest.sequence - 17_000, 1);

  const res = await server.getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [CONFIG.contractId] }],
    limit,
  });

  const events: GameEvent[] = [];

  for (const ev of res.events) {
    try {
      const topics = ev.topic.map((t) => scValToNative(t));
      const type = String(topics[0]) as GameEventType;
      if (!EVENT_TYPES.includes(type)) continue;

      const roomId = BigInt(topics[1] as bigint);
      const data = scValToNative(ev.value) as unknown[];

      let address = "";
      let amount: bigint | null = null;
      let result: CoinSide | null = null;

      switch (type) {
        case "created":
          // (creator, entry_fee, side)
          address = String(data[0]);
          amount = BigInt(data[1] as bigint);
          break;
        case "joined":
          // (opponent, entry_fee, resolve_at)
          address = String(data[0]);
          amount = BigInt(data[1] as bigint);
          break;
        case "resolved":
          // (winner, result, pot)
          address = String(data[0]);
          result = Number(data[1]) as CoinSide;
          amount = BigInt(data[2] as bigint);
          break;
        case "cancelled":
          // (creator, entry_fee)
          address = String(data[0]);
          amount = BigInt(data[1] as bigint);
          break;
      }

      events.push({
        id: ev.id,
        type,
        roomId,
        address,
        amount,
        result,
        txHash: ev.txHash,
        ledger: ev.ledger,
        timestamp: new Date(ev.ledgerClosedAt).getTime(),
      });
    } catch {
      // Skip events that fail to parse rather than break the feed.
      continue;
    }
  }

  // Newest first.
  return events.sort((a, b) => b.timestamp - a.timestamp);
}
