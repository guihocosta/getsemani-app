"use client";

import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-primary text-white shadow-premium hover:bg-primary-600",
  secondary: "bg-surface-2 text-text border border-border hover:bg-border/70",
  ghost: "bg-transparent text-text-muted hover:text-text hover:bg-surface-2",
  danger: "bg-transparent text-danger hover:bg-danger/10",
};

// Hover/tap em CSS (antes motion.button): o efeito e so escala, e framer-motion
// aqui entrava no bundle de toda tela com botao, inclusive /login.
export function Button({
  variant = "primary",
  tone,
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant; tone?: Variant | "neutral" | string }) {
  const effectiveVariant: Variant = tone === "neutral" ? "secondary" : (tone as Variant) || variant;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold",
        "transition-[color,background-color,scale] duration-150 hover:scale-[1.01] active:scale-[0.98]",
        "disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        styles[effectiveVariant] ?? styles.primary,
        className,
      )}
      {...props}
    />
  );
}
