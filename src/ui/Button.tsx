"use client";

import { motion } from "framer-motion";
import { cn } from "./cn";
import type { HTMLMotionProps } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-primary text-white shadow-premium hover:bg-primary-600",
  secondary: "bg-surface-2 text-text border border-border hover:bg-border/70",
  ghost: "bg-transparent text-text-muted hover:text-text hover:bg-surface-2",
  danger: "bg-transparent text-danger hover:bg-danger/10",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: HTMLMotionProps<"button"> & { variant?: Variant }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold",
        "transition-colors disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
