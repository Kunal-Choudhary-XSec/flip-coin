import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shorten a Stellar address: GABC…WXYZ */
export function shortAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

const STROOPS_PER_XLM = 10_000_000n;

/** Convert stroops (bigint) to a display XLM string. */
export function stroopsToXlm(stroops: bigint): string {
  const whole = stroops / STROOPS_PER_XLM;
  const frac = (stroops % STROOPS_PER_XLM).toString().padStart(7, "0").replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole.toString();
}

/** Convert an XLM decimal string to stroops. Throws on invalid input. */
export function xlmToStroops(xlm: string): bigint {
  const trimmed = xlm.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(trimmed)) {
    throw new Error("Invalid XLM amount");
  }
  const [whole, frac = ""] = trimmed.split(".");
  return BigInt(whole) * STROOPS_PER_XLM + BigInt(frac.padEnd(7, "0"));
}

/** Format a unix-ms timestamp as a locale time string. */
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

/** Format a unix-ms timestamp as a full locale date+time string. */
export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

/** Human-friendly relative time, e.g. "12s ago". */
export function timeAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
