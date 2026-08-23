/** Maps raw wallet / RPC / contract errors to user-friendly messages. */

const CONTRACT_ERRORS: Record<number, string> = {
  1: "This room no longer exists.",
  2: "This room is not open for joining.",
  3: "Hold on — the countdown (10s entry + 5s flip) hasn't finished yet.",
  4: "This room has already been settled.",
  5: "You can't join your own room.",
  6: "Entry fee must be greater than zero.",
  7: "Pick a valid side: heads or tails.",
  8: "Only the room creator can do that.",
  9: "An opponent already joined — the room can only be flipped.",
};

/** Extract `Error(Contract, #N)` codes from simulation/submission errors. */
function contractErrorCode(message: string): number | null {
  const match = message.match(/Error\(Contract,\s*#(\d+)\)/);
  return match ? Number(match[1]) : null;
}

export function toUserError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err ?? "Unknown error");

  const msg = raw.toLowerCase();

  // Contract business-logic errors
  const code = contractErrorCode(raw);
  if (code !== null && CONTRACT_ERRORS[code]) {
    return CONTRACT_ERRORS[code];
  }

  // Wallet: user rejected
  if (
    msg.includes("declined") ||
    msg.includes("rejected") ||
    msg.includes("denied") ||
    msg.includes("cancelled by user") ||
    msg.includes("canceled by user") ||
    msg.includes("user closed")
  ) {
    return "Transaction was rejected in your wallet.";
  }

  // Wallet: not installed / not found
  if (
    msg.includes("wallet not found") ||
    msg.includes("is not installed") ||
    msg.includes("not available") ||
    msg.includes("no wallet")
  ) {
    return "Wallet not found. Please install the wallet extension and refresh the page.";
  }

  // Insufficient balance
  if (
    msg.includes("insufficient") ||
    msg.includes("underfunded") ||
    msg.includes("balance is not sufficient") ||
    msg.includes("resulting balance is not within the allowed range")
  ) {
    return "Insufficient XLM balance to cover the entry fee and network fees.";
  }

  // Account not funded on testnet
  if (msg.includes("account not found") || msg.includes("404")) {
    return "Account not found on the network. Fund it with Friendbot first (see Dashboard).";
  }

  if (msg.includes("txbadseq")) {
    return "Transaction sequence error — please try again.";
  }

  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "The network took too long to respond. Please try again.";
  }

  // XDR from a newer protocol than the SDK understands — the transaction
  // itself usually succeeded; only the response parsing failed.
  if (msg.includes("bad union switch")) {
    return "The network returned data in a newer format than expected — your transaction likely succeeded. Check the Transactions page or explorer.";
  }

  // Fallback: keep it short
  return raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;
}
