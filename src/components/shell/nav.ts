import {
  Home,
  Table2,
  Map,
  Building2,
  HardHat,
  Calculator,
  CalendarClock,
  Briefcase,
  Bell,
  ShieldCheck,
  PlugZap,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  num: number;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Discover",
    items: [
      { href: "/home", label: "Home", icon: Home, num: 1 },
      { href: "/listings", label: "Listings", icon: Table2, num: 2 },
      { href: "/map", label: "Map", icon: Map, num: 4 },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/neighborhoods", label: "Neighborhoods", icon: LayoutDashboard, num: 5 },
      { href: "/developers", label: "Developers", icon: Building2, num: 6 },
      { href: "/projects", label: "Projects", icon: HardHat, num: 6 },
    ],
  },
  {
    label: "Analyze",
    items: [
      { href: "/yield", label: "Returns Calculator", icon: Calculator, num: 7 },
      { href: "/payment-plan", label: "Payment Plans", icon: CalendarClock, num: 8 },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: Briefcase, num: 9 },
      { href: "/alerts", label: "Alerts", icon: Bell, num: 10 },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/data-quality", label: "Data Quality", icon: ShieldCheck, num: 11 },
      { href: "/admin", label: "Data Sources", icon: PlugZap, num: 12 },
    ],
  },
];
