import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950 shadow-lg shadow-amber-500/25 hover:from-amber-300 hover:to-amber-400 hover:shadow-amber-500/40 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-black/[0.08] bg-white/50 backdrop-blur-md hover:bg-white/70 hover:text-accent-foreground dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] active:scale-[0.98]",
        secondary:
          "border border-black/[0.05] bg-white/40 text-secondary-foreground backdrop-blur-md hover:bg-white/60 dark:border-white/[0.06] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] active:scale-[0.98]",
        ghost:
          "hover:bg-black/[0.04] hover:text-accent-foreground dark:hover:bg-white/[0.06]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-2xl px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
