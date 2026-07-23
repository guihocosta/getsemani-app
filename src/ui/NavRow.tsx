import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

export function NavRow({
  href,
  label,
  subtitle,
  Icon,
}: {
  href: string;
  label: string;
  subtitle?: string;
  Icon: ComponentType<LucideProps>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3 -mx-1 px-1 rounded-xl hover:bg-surface-2/70 transition-colors"
    >
      <div className="h-10 w-10 shrink-0 rounded-xl bg-accent-soft ring-1 ring-primary/20 flex items-center justify-center text-primary">
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text">{label}</p>
        {subtitle && <p className="text-xs text-text-muted truncate">{subtitle}</p>}
      </div>
      <ChevronRight size={18} className="text-text-muted shrink-0" strokeWidth={1.8} />
    </Link>
  );
}
