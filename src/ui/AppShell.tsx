"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode, ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { Home, HandHelping, Calendar, Settings, User } from "lucide-react";
import { cn } from "./cn";
import { SwipeNav } from "./SwipeNav";

type NavItem = { href: string; label: string; Icon: ComponentType<LucideProps> };

const BASE_NAV: NavItem[] = [
  { href: "/", label: "Início", Icon: Home },
  { href: "/vagas", label: "Vagas", Icon: HandHelping },
  { href: "/escalas", label: "Escalas", Icon: Calendar },
];

const MANAGE_NAV: NavItem = { href: "/admin", label: "Gestão", Icon: Settings };
const PROFILE_NAV: NavItem = { href: "/perfil", label: "Perfil", Icon: User };

export function AppShell({
  children,
  isAdmin = false,
  isLeader = false,
  pendingCount = 0,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  isLeader?: boolean;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const nav = [...BASE_NAV, ...(isAdmin || isLeader ? [MANAGE_NAV] : []), PROFILE_NAV];

  return (
    <div className="min-h-dvh mx-auto max-w-md flex flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <main className="flex-1 pb-[calc(8rem+env(safe-area-inset-bottom))] px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <SwipeNav tabs={nav.map((n) => n.href)}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        </SwipeNav>
      </main>

      {/* Esmaece o conteudo que rola atras da nav em vez de deixa-lo nitido no
          vao abaixo do pill. from-bg acompanha o tema (claro/escuro) sozinho. */}
      <div className="fixed bottom-0 inset-x-0 z-10 h-36 pointer-events-none bg-gradient-to-t from-bg via-bg/85 to-transparent" />

      <nav className="fixed z-20 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] inset-x-0 px-6 mx-auto max-w-md">
        <ul
          className={cn(
            "grid bg-surface/70 backdrop-blur-3xl rounded-[2rem] ring-1 ring-border/60 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)]",
            nav.length === 5 ? "grid-cols-5" : "grid-cols-4",
          )}
        >
          {nav.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const showPendingDot = href === "/admin" && pendingCount > 0;
            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  className={cn(
                    "relative z-10 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors",
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
                  <span className="relative">
                    <Icon size={20} strokeWidth={1.8} />
                    {showPendingDot && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-danger" />
                    )}
                  </span>
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
