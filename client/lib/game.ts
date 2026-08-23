import type { Room, RoomUiState } from "@/types";

/**
 * Derive the UI state of a room from on-chain status + wall-clock time.
 * The countdown starts only when an opponent joins:
 * 10s entry window → 5s flip delay → flippable.
 * Ledger timestamps track real time closely enough for a 10s/5s window UI.
 */
export function getRoomUiState(room: Room, nowMs = Date.now()): RoomUiState {
  const now = Math.floor(nowMs / 1000);
  switch (room.status) {
    case "Open":
      return "joinable"; // no countdown — waits for an opponent indefinitely
    case "Matched":
      if (now < room.entryDeadline) return "entry-window";
      return now < room.resolveAt ? "waiting-flip" : "flippable";
    case "Resolved":
      return "resolved";
    case "Cancelled":
      return "cancelled";
  }
}

export function isPlayerInRoom(room: Room, address: string | null): boolean {
  if (!address) return false;
  return room.creator === address || room.opponent === address;
}

export function sideLabel(side: number | null): string {
  if (side === null) return "—";
  return side === 0 ? "Heads" : "Tails";
}
