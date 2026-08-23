"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRoom, fetchRooms } from "@/lib/contract";
import { ROOMS_POLL_INTERVAL, isContractConfigured } from "@/lib/config";

/** Poll the most recent rooms from the contract. */
export function useRooms(limit = 50) {
  return useQuery({
    queryKey: ["rooms", limit],
    enabled: isContractConfigured(),
    refetchInterval: ROOMS_POLL_INTERVAL,
    queryFn: () => fetchRooms(0n, limit),
  });
}

/** Poll a single room — faster interval for live game screens. */
export function useRoom(roomId: bigint | null) {
  return useQuery({
    queryKey: ["room", roomId?.toString()],
    enabled: roomId !== null && isContractConfigured(),
    refetchInterval: 2_000,
    queryFn: () => fetchRoom(roomId!),
  });
}
