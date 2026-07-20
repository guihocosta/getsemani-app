import { cn } from "./cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl p-5",
        "bg-surface border border-border",
        "shadow-premium hover:shadow-lg transition-shadow",
        className,
      )}
      {...props}
    />
  );
}
