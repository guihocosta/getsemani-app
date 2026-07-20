"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, ComponentType, SVGProps } from "react";
import { cn } from "./cn";
import { IconHome, IconHand, IconCalendarOff, IconCalendar, IconGear, IconBell } from "./icons";

const nav: { href: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { href: "/", label: "Início", Icon: IconHome },
  { href: "/vagas", label: "Vagas", Icon: IconHand },
  { href: "/indisponibilidade", label: "Agenda", Icon: IconCalendarOff },
  { href: "/escalas", label: "Escalas", Icon: IconCalendar },
];

export function AppShell({
  children,
  isAdmin = false,
  isLeader = false,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  isLeader?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh mx-auto max-w-md flex flex-col">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <span className="font-title text-lg tracking-wide text-white">
          GETSE<span className="text-primary">MANI</span>
        </span>
        <div className="flex items-center gap-3">
          {(isAdmin || isLeader) && (
            <Link
              href="/solicitacoes"
              aria-label="Solicitações"
              className={cn(
                "transition-colors",
                pathname.startsWith("/solicitacoes")
                  ? "text-primary"
                  : "text-text-muted hover:text-white",
              )}
            >
              <IconBell width={20} height={20} />
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              aria-label="Gestão"
              className={cn(
                "transition-colors",
                pathname.startsWith("/admin") ? "text-primary" : "text-text-muted hover:text-white",
              )}
            >
              <IconGear width={20} height={20} />
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 pb-28 px-4 pt-2">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 mx-auto max-w-md border-t border-border bg-bg/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {nav.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "relative flex flex-col items-center gap-1 py-3 text-xs transition-colors",
                    active ? "text-primary" : "text-text-muted hover:text-white",
                  )}
                >
                  {active && (
                    <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                  )}
                  <Icon width={22} height={22} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
