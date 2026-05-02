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
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/inbox", label: "Caixa de entrada", icon: Inbox },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/funil", label: "Funil", icon: TrendingUp },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
