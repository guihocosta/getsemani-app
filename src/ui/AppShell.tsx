"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { activeHref, isWideRoute, navItems } from "./navItems";
import { SwipeNav } from "./SwipeNav";

export function AppShell({
  children,
  isAdmin = false,
  isLeader = false,
  hasRepertoire = false,
  pendingCount = 0,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  isLeader?: boolean;
  hasRepertoire?: boolean;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const items = navItems({ isAdmin, isLeader, hasRepertoire });
  const nav = items.filter((n) => n.tab);
  const activeTab = activeHref(pathname, nav.map((n) => n.href));
  const activeItem = activeHref(pathname, items.map((n) => n.href));

  return (
    <div className="min-h-dvh mx-auto max-w-md lg:mx-0 lg:max-w-none lg:pl-60 flex flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <nav
        aria-label="Menu lateral"
        className="hidden lg:flex fixed inset-y-0 left-0 z-20 w-60 flex-col gap-1 overflow-y-auto border-r border-border bg-surface px-3 py-6"
      >
        <p className="font-title text-xl text-text px-3 mb-4">Getsemani</p>
        {items.map(({ href, label, Icon }) => {
          const active = href === activeItem;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden />
              {label}
              {href === "/admin" && pendingCount > 0 && (
                <span data-testid="pendencia" className="ml-auto h-2 w-2 rounded-full bg-danger" />
              )}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 pb-[calc(8rem+env(safe-area-inset-bottom))] px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] lg:px-8 lg:py-8">
        <div className={cn("lg:mx-auto", isWideRoute(pathname) ? "lg:max-w-6xl" : "lg:max-w-md")}>
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
        </div>
      </main>

      {/* Esmaece o conteudo que rola atras da nav em vez de deixa-lo nitido no
          vao abaixo do pill. from-bg acompanha o tema (claro/escuro) sozinho. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-10 h-36 pointer-events-none bg-gradient-to-t from-bg via-bg/85 to-transparent" />

      <nav className="lg:hidden fixed z-20 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] inset-x-0 px-6 mx-auto max-w-md">
        <ul
          className={cn(
            "grid bg-surface/70 backdrop-blur-3xl rounded-[2rem] ring-1 ring-border/60 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)]",
            nav.length === 5 ? "grid-cols-5" : "grid-cols-4",
          )}
        >
          {nav.map(({ href, label, Icon }) => {
            const active = href === activeTab;
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
