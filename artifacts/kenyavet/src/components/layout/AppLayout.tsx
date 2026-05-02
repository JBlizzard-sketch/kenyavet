import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ClipboardList, Users, FileText,
  UserCog, Settings, LogOut, Menu, X, Shield,
  ChevronRight, Bell, CheckCircle, TrendingUp, CreditCard, AlertCircle,
  ClipboardCheck, User,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

interface ActivityItem {
  id: number;
  type: string;
  message: string;
  workerName: string | null;
  linkId: number | null;
  createdAt: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Vetting Requests", href: "/vetting-requests", icon: ClipboardList },
  { label: "My Staff", href: "/staff", icon: UserCog },
  { label: "Workers", href: "/workers", icon: Users },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Ops Workflow", href: "/ops", icon: ClipboardCheck, roles: ["admin", "ops"] },
  { label: "Admin", href: "/admin", icon: Settings, roles: ["admin", "ops"] },
];

function activityIcon(type: string) {
  switch (type) {
    case "report_ready": return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    case "vetting_in_progress": return <TrendingUp className="w-3.5 h-3.5 text-blue-500" />;
    case "payment_received": return <CreditCard className="w-3.5 h-3.5 text-violet-500" />;
    default: return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const visibleItems = navItems.filter(item =>
    !item.roles || item.roles.includes(user?.role ?? "")
  );

  useEffect(() => {
    if (!token) return;
    apiFetch<ActivityItem[]>("/dashboard/activity", { token })
      .then(items => {
        setActivity(items);
        setUnread(items.filter(i => {
          const seenUntil = parseInt(localStorage.getItem("kenyavet_notif_seen") ?? "0", 10);
          return new Date(i.createdAt).getTime() > seenUntil;
        }).length);
      })
      .catch(() => {});
  }, [token]);

  function openNotif() {
    setNotifOpen(true);
    setUnread(0);
    localStorage.setItem("kenyavet_notif_seen", String(Date.now()));
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-200 ease-in-out",
        "lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-sidebar-foreground font-semibold text-base tracking-tight">KenyaVet</span>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleItems.map(item => {
            const active = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border px-3 py-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sidebar-primary text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground text-sm font-medium truncate">{user?.name}</p>
              <p className="text-sidebar-foreground/50 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <Link
            href="/profile"
            onClick={() => setSidebarOpen(false)}
            className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <User className="w-4 h-4" />
            My Profile
          </Link>
          <button
            onClick={logout}
            className="mt-0.5 w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center gap-4 px-4 lg:px-6 border-b bg-background shrink-0">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={openNotif}
              className="relative text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">Notifications</p>
                  <span className="text-xs text-muted-foreground">{activity.length} updates</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {activity.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                  ) : (
                    activity.map(item => (
                      <div
                        key={item.id}
                        className="px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 shrink-0">{activityIcon(item.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground leading-snug">{item.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(item.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
                  <Link
                    href="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-primary hover:underline"
                  >
                    View all notifications →
                  </Link>
                  <Link
                    href="/vetting-requests"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Requests →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span>{user?.neighbourhood || "Nairobi"}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
