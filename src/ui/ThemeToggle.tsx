"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "./cn";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#020617" : "#f8fafc");
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  if (dark === null) return <div className={cn("h-5 w-5", className)} />;

  return (
    <button
      type="button"
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      className={cn("text-text-muted hover:text-text transition-colors", className)}
      onClick={() => {
        applyTheme(!dark);
        setDark(!dark);
      }}
    >
      {dark ? <Sun size={20} strokeWidth={1.8} /> : <Moon size={20} strokeWidth={1.8} />}
    </button>
  );
}
