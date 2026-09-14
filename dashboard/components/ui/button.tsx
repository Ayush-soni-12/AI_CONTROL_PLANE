import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_22px_rgba(6,182,212,0.4)] active:scale-[0.98]",
        destructive:
          "bg-red-500/90 text-white hover:bg-red-500 focus-visible:ring-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.25)] active:scale-[0.98]",
        outline:
          "border border-white/10 bg-slate-900/50 shadow-xs hover:bg-slate-800/80 hover:border-cyan-500/30 text-slate-200 backdrop-blur-md active:scale-[0.98]",
        secondary:
          "bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 border border-slate-700/50 active:scale-[0.98]",
        ghost:
          "hover:bg-slate-800/60 hover:text-white text-slate-400 active:scale-[0.98]",
        link:
          "text-cyan-400 underline-offset-4 hover:underline",
        cyan:
          "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-[0.98]",
        emerald:
          "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-[0.98]",
        purple:
          "bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] active:scale-[0.98]",
        glass:
          "bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 border border-white/10 backdrop-blur-md hover:border-cyan-500/30 active:scale-[0.98]",
        neon:
          "border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)] active:scale-[0.98]",
      },
      size: {
        default: "h-9.5 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6.5 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8.5 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-4 text-base",
        icon: "size-9.5 rounded-xl",
        "icon-xs": "size-6.5 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8.5 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
