import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Cake,
  Calendar,
  CalendarOff,
  HandHelping,
  Home,
  LayoutGrid,
  Megaphone,
  Music,
  Settings,
  User,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<LucideProps>;
  tab: boolean; // aparece tambem na barra inferior
};

export function navItems({
  isAdmin,
  isLeader,
  hasRepertoire,
}: {
  isAdmin: boolean;
  isLeader: boolean;
  hasRepertoire: boolean;
}): NavItem[] {
  return [
    { href: "/", label: "Início", Icon: Home, tab: true },
    { href: "/vagas", label: "Vagas", Icon: HandHelping, tab: true },
    { href: "/escalas", label: "Escalas", Icon: Calendar, tab: true },
    { href: "/escalas/panorama", label: "Panorama", Icon: LayoutGrid, tab: false },
    { href: "/indisponibilidade", label: "Agenda", Icon: CalendarOff, tab: false },
    { href: "/avisos", label: "Avisos", Icon: Megaphone, tab: false },
    ...(hasRepertoire ? [{ href: "/repertorio", label: "Repertório", Icon: Music, tab: false }] : []),
    { href: "/aniversariantes", label: "Aniversariantes", Icon: Cake, tab: false },
    ...(isAdmin || isLeader ? [{ href: "/admin", label: "Gestão", Icon: Settings, tab: true }] : []),
    { href: "/perfil", label: "Perfil", Icon: User, tab: true },
  ];
}

// O href mais especifico vence: /escalas/panorama marca Panorama, nao Escalas.
export function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs
    .filter((href) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];
}

const WIDE_ROUTES = ["/", "/escalas", "/escalas/panorama", "/admin", "/admin/visao-geral"];

// Telas densas usam a largura; o resto (formularios, leitura) fica em coluna.
export function isWideRoute(pathname: string): boolean {
  return WIDE_ROUTES.includes(pathname);
}
