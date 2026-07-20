import { cn } from "./cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-700/30 hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-2/70 text-white border border-border hover:bg-surface-2",
  ghost: "bg-transparent text-text-muted hover:text-white",
  danger: "bg-transparent text-danger hover:brightness-110",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-[15px] font-medium",
        "transition disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
