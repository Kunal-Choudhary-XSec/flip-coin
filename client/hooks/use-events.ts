"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGameEvents } from "@/lib/contract";
import { EVENTS_POLL_INTERVAL, isContractConfigured } from "@/lib/config";

/**
 * Poll contract events for the real-time activity feed.
 * Every entry originates from an on-chain contract interaction.
 */
export function useGameEvents(limit = 100) {
  return useQuery({
    queryKey: ["game-events", limit],
    enabled: isContractConfigured(),
    refetchInterval: EVENTS_POLL_INTERVAL,
    queryFn: () => fetchGameEvents(limit),
  });
}
