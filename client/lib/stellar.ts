import { Horizon, rpc } from "@stellar/stellar-sdk";
import { CONFIG } from "@/lib/config";

export interface FinalTxResult {
  status: "SUCCESS" | "FAILED";
  /** Base64-encoded ScVal returned by the invoked contract function, if any. */
  returnValueXdr: string | null;
}

let rpcServer: rpc.Server | null = null;
let horizonServer: Horizon.Server | null = null;

/** Shared Soroban RPC server instance. */
export function getRpcServer(): rpc.Server {
  if (!rpcServer) {
    rpcServer = new rpc.Server(CONFIG.rpcUrl, {
      allowHttp: CONFIG.rpcUrl.startsWith("http://"),
    });
  }
  return rpcServer;
}

/** Shared Horizon server instance (balances / account info). */
export function getHorizonServer(): Horizon.Server {
  if (!horizonServer) {
    horizonServer = new Horizon.Server(CONFIG.horizonUrl);
  }
  return horizonServer;
}

/**
 * Poll a sent transaction until it reaches a final status.
 *
 * Uses a raw JSON-RPC call and reads only the `status` field instead of
 * `rpc.Server.getTransaction`, because the SDK tries to decode the full
 * result metadata XDR — which throws "Bad union switch: 4" on networks
 * running protocol 23+ (TransactionMetaV4). We don't need the metadata here;
 * the contract's return value is taken from the simulation instead.
 */
export async function waitForTransaction(
  hash: string,
  timeoutMs = 60_000,
): Promise<FinalTxResult> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(CONFIG.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: { hash },
      }),
    });
    const json: { result?: { status?: string; returnValue?: string } } =
      await res.json();
    const status = json.result?.status;
    if (status === "SUCCESS" || status === "FAILED") {
      return {
        status,
        returnValueXdr: json.result?.returnValue ?? null,
      };
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error("Timed out waiting for transaction confirmation");
}
