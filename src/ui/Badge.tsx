import { cn } from "./cn";
import type { HTMLAttributes } from "react";

type Tone = "info" | "muted" | "danger";

const tones: Record<Tone, string> = {
  info: "bg-accent-soft text-primary ring-1 ring-primary/25",
  muted: "bg-white/5 text-text-muted ring-1 ring-border",
  danger: "bg-danger/15 text-danger ring-1 ring-danger/30",
};

export function Badge({
  tone = "info",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
