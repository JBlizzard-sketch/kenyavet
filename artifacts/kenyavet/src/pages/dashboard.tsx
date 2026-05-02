import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg } from "@/lib/utils";
import { ClipboardList, Users, CheckCircle, Clock, ArrowRight, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalRequests: number;
  completed: number;
  inProgress: number;
  pendingPayment: number;
  staffCount: number;
}

interface RecentRequest {
  id: number;
  workerName: string;
  workerRole: string;
  status: string;
  packageName: string;
  trustScore: number | null;
  createdAt: string;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, recentData] = await Promise.all([
          apiFetch<DashboardStats>("/dashboard/stats", { token }),
          apiFetch<RecentRequest[]>("/dashboard/recent-requests", { token }),
        ]);
        setStats(statsData);
        setRecent(recentData);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const statCards = [
    { label: "Total Requests", value: stats?.totalRequests ?? 0, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
    { label: "In Progress", value: stats?.inProgress ?? 0, icon: TrendingUp, color: "text-violet-600 bg-violet-50" },
    { label: "My Staff", value: stats?.staffCount ?? 0, icon: Users, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">
              Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Here's your vetting overview</p>
          </div>
          <Link href="/vetting-requests/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Vetting Request
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card rounded-xl border border-card-border p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{loading ? "—" : value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Recent requests */}
        <div className="bg-card rounded-xl border border-card-border">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Requests</h2>
            <Link href="/vetting-requests" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No vetting requests yet.</p>
                <Link href="/vetting-requests/new">
                  <Button size="sm" className="mt-4">Submit first request</Button>
                </Link>
              </div>
            ) : (
              recent.map(req => (
                <Link
                  key={req.id}
                  href={`/vetting-requests/${req.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xs font-bold">{req.workerName.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{req.workerName}</p>
                    <p className="text-xs text-muted-foreground">{req.workerRole} · {req.packageName}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    {req.trustScore != null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getTrustScoreBg(req.trustScore)}`}>
                        {req.trustScore}/100
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(req.status)}`}>
                      {getStatusLabel(req.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            { href: "/vetting-requests/new", icon: ClipboardList, label: "New Vetting Request", desc: "Submit a worker for background check" },
            { href: "/workers", icon: Users, label: "Browse Workers", desc: "View our verified worker directory" },
            { href: "/staff", icon: Users, label: "Manage My Staff", desc: "View and track your household staff" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-3 p-4 bg-card rounded-xl border border-card-border hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
