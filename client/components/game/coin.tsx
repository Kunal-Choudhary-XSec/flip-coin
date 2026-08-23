"use client";

import { cn } from "@/lib/utils";
import { CoinSide } from "@/types";

interface CoinProps {
  /** Final side to show. null = unknown. */
  side: CoinSide | null;
  /** Continuous spin (flip in progress). */
  flipping?: boolean;
  /** Play the dramatic landing animation onto `side`. */
  landing?: boolean;
  size?: "sm" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "h-10 w-10 text-sm",
  lg: "h-28 w-28 text-3xl",
  xl: "h-40 w-40 text-5xl",
};

/** A 3D CSS coin that can idle, spin continuously, land dramatically, or rest on a side. */
export function Coin({ side, flipping = false, landing = false, size = "lg", className }: CoinProps) {
  const dim = SIZES[size];

  return (
    <div
      className={cn("coin-scene", className)}
      aria-label={flipping ? "Flipping coin" : side !== null ? (side === CoinSide.Heads ? "Heads" : "Tails") : "Coin"}
    >
      <div
        className={cn(
          "coin relative rounded-full font-bold",
          dim,
          flipping && "coin-spinning",
          !flipping && landing && side === CoinSide.Heads && "coin-land-heads",
          !flipping && landing && side === CoinSide.Tails && "coin-land-tails",
        )}
        style={{
          transform:
            !flipping && !landing && side === CoinSide.Tails
              ? "rotateY(180deg)"
              : undefined,
        }}
      >
        <div className={cn("coin-face coin-heads flex items-center justify-center rounded-full border-amber-300 bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900 shadow-lg", size === "sm" ? "border-2" : "border-4")}>
          H
        </div>
        <div className={cn("coin-face coin-tails flex items-center justify-center rounded-full border-slate-300 bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 shadow-lg", size === "sm" ? "border-2" : "border-4")}>
          T
        </div>
      </div>
    </div>
  );
}
