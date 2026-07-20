import { IconCalendar } from "./icons";

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="mb-4 h-16 w-16 rounded-2xl bg-accent-soft ring-1 ring-primary/20 flex items-center justify-center text-primary">
        <IconCalendar width={28} height={28} />
      </div>
      <p className="text-lg text-text">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-text-muted max-w-xs">{subtitle}</p>}
    </div>
  );
}
