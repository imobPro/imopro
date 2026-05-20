import {
  Inbox,
  Users,
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Label mais curto pra contextos onde espaço é limitado (bottom-tabs). */
  shortLabel?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

// Sidebar desktop — organizada em seções
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Atendimento",
    items: [
      { href: "/inbox", label: "Caixa de entrada", icon: Inbox, shortLabel: "Inbox" },
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/funil", label: "Funil", icon: TrendingUp },
    ],
  },
  {
    title: "Análise",
    items: [
      { href: "/metricas", label: "Métricas", icon: BarChart3 },
      { href: "/relatorios", label: "Relatórios", icon: FileText },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações", icon: Settings, shortLabel: "Config" },
    ],
  },
];

// Flatten para uso em outros lugares (ex.: title lookup por pathname)
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

// Mobile bottom-tabs — só os 4 mais usados em campo (alcance do polegar)
export const MOBILE_NAV: NavItem[] = [
  { href: "/inbox", label: "Caixa de entrada", icon: Inbox, shortLabel: "Inbox" },
  { href: "/funil", label: "Funil", icon: TrendingUp },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings, shortLabel: "Config" },
];

/** Resolve título exibido na app bar mobile a partir do pathname. */
export function getNavTitleForPath(pathname: string): string | null {
  // Match exato primeiro, depois prefixo
  const exact = NAV_ITEMS.find((i) => i.href === pathname);
  if (exact) return exact.label;
  const prefix = NAV_ITEMS.find((i) => pathname.startsWith(`${i.href}/`));
  if (prefix) return prefix.label;
  return null;
}
