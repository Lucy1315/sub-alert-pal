import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CreditCard, ScrollText, Settings } from "lucide-react";
import { ModeBadge } from "./ModeBadge";

const navItems = [
  { to: "/", label: "대시보드", icon: LayoutDashboard },
  { to: "/subscriptions", label: "구독 관리", icon: CreditCard },
  { to: "/logs", label: "알림 로그", icon: ScrollText },
  { to: "/settings", label: "설정", icon: Settings },
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-sidebar p-4 lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            SR
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">SubReminder</h1>
            <p className="text-[11px] text-muted-foreground">구독 결제 알림</p>
          </div>
        </div>

        <div className="mb-6 px-2">
          <ModeBadge isTestMode={true} />
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
              SR
            </div>
            <span className="font-bold text-sm">SubReminder</span>
          </div>
          <ModeBadge isTestMode={true} />
        </header>

        {/* Mobile nav */}
        <nav className="flex border-b border-border bg-card px-2 lg:hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};
