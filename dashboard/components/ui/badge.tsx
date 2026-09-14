import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-cyan-500/20 bg-cyan-500/10 text-cyan-300 [a&]:hover:bg-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.1)]",
        secondary:
          "border-slate-700/50 bg-slate-800/60 text-slate-300 [a&]:hover:bg-slate-700/60",
        destructive:
          "border-red-500/30 bg-red-500/10 text-red-400 [a&]:hover:bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]",
        outline:
          "border-white/10 text-slate-300 [a&]:hover:bg-white/5 [a&]:hover:text-white",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 [a&]:hover:bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-400 [a&]:hover:bg-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]",
        error:
          "border-red-500/30 bg-red-500/10 text-red-400 [a&]:hover:bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]",
        cyan:
          "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 [a&]:hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.15)]",
        emerald:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 [a&]:hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
        purple:
          "border-purple-500/30 bg-purple-500/10 text-purple-300 [a&]:hover:bg-purple-500/20 shadow-[0_0_10px_rgba(139,92,246,0.15)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
