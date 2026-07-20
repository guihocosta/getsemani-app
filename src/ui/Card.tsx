import { cn } from "./cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[20px] p-5",
        "bg-gradient-to-b from-surface to-surface/60 backdrop-blur-xl",
        "ring-1 ring-border shadow-xl shadow-black/25",
        className,
      )}
      {...props}
    />
  );
}
