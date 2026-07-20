"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode, ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { Home, HandHelping, CalendarOff, Calendar, Settings, Bell } from "lucide-react";
import { cn } from "./cn";
import { ThemeToggle } from "./ThemeToggle";

const nav: { href: string; label: string; Icon: ComponentType<LucideProps> }[] = [
  { href: "/", label: "Início", Icon: Home },
  { href: "/vagas", label: "Vagas", Icon: HandHelping },
  { href: "/indisponibilidade", label: "Agenda", Icon: CalendarOff },
  { href: "/escalas", label: "Escalas", Icon: Calendar },
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
      <header className="px-5 pt-6 pb-2 flex items-center justify-end gap-4">
        {(isAdmin || isLeader) && (
          <Link
            href="/solicitacoes"
            aria-label="Solicitações"
            className={cn(
              "transition-colors",
              pathname.startsWith("/solicitacoes") ? "text-primary" : "text-text-muted hover:text-text",
            )}
          >
            <Bell size={20} strokeWidth={1.8} />
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            aria-label="Gestão"
            className={cn(
              "transition-colors",
              pathname.startsWith("/admin") ? "text-primary" : "text-text-muted hover:text-text",
            )}
          >
            <Settings size={20} strokeWidth={1.8} />
          </Link>
        )}
        <ThemeToggle />
      </header>

      <main className="flex-1 pb-32 px-4 pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] inset-x-0 px-6 mx-auto max-w-md">
        <ul className="grid grid-cols-4 bg-surface/70 backdrop-blur-3xl rounded-[2rem] ring-1 ring-border/60 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)]">
          {nav.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  className={cn(
                    "relative z-10 flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors",
                    active ? "text-primary" : "text-text-muted hover:text-text",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-1.5 -z-10 rounded-2xl bg-primary/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={22} strokeWidth={1.8} />
                  {label}
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
