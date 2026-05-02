import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg } from "@/lib/utils";
import {
  ClipboardList, Users, CheckCircle, TrendingUp, Plus, ArrowRight,
  CreditCard, FileText, Shield, Bell, Zap,
} from "lucide-react";
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

interface ActivityItem {
  id: number;
  type: string;
  message: string;
  workerName: string | null;
  linkId: number | null;
  createdAt: string;
}

function activityIcon(type: string) {
  if (type === "payment_received") return <CreditCard className="w-3.5 h-3.5 text-emerald-600" />;
  if (type === "report_ready") return <FileText className="w-3.5 h-3.5 text-blue-600" />;
  if (type === "vetting_started") return <Shield className="w-3.5 h-3.5 text-violet-600" />;
  if (type === "step_completed") return <CheckCircle className="w-3.5 h-3.5 text-teal-600" />;
  if (type === "request_submitted") return <ClipboardList className="w-3.5 h-3.5 text-orange-500" />;
  return <Bell className="w-3.5 h-3.5 text-muted-foreground" />;
}

function activityBg(type: string) {
  if (type === "payment_received") return "bg-emerald-50";
  if (type === "report_ready") return "bg-blue-50";
  if (type === "vetting_started") return "bg-violet-50";
  if (type === "step_completed") return "bg-teal-50";
  if (type === "request_submitted") return "bg-orange-50";
  return "bg-muted";
}

function activityLink(item: ActivityItem): string | null {
  if (!item.linkId) return null;
  if (item.type === "report_ready") return `/reports`;
  if (item.type === "payment_received") return `/vetting-requests/${item.linkId}`;
  if (item.type === "vetting_started" || item.type === "step_completed" || item.type === "request_submitted") {
    return `/vetting-requests/${item.linkId}`;
  }
  return null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentRequest[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, recentData, activityData] = await Promise.all([
          apiFetch<DashboardStats>("/dashboard/stats", { token }),
          apiFetch<RecentRequest[]>("/dashboard/recent-requests", { token }),
          apiFetch<ActivityItem[]>("/dashboard/activity", { token }),
        ]);
        setStats(statsData);
        setRecent(recentData);
        setActivity(activityData);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const completionRate = stats && stats.totalRequests > 0
    ? Math.round((stats.completed / stats.totalRequests) * 100)
    : 0;

  const statCards = [
    { label: "Total Requests", value: stats?.totalRequests ?? 0, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
    { label: "In Progress", value: stats?.inProgress ?? 0, icon: TrendingUp, color: "text-violet-600 bg-violet-50" },
    { label: "My Staff", value: stats?.staffCount ?? 0, icon: Users, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Greeting */}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card rounded-xl border border-card-border p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-foreground">{loading ? "—" : value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Completion rate bar */}
        {!loading && stats && stats.totalRequests > 0 && (
          <div className="bg-card rounded-xl border border-card-border p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">Completion Rate</span>
              </div>
              <span className="text-sm font-bold text-foreground">{completionRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.completed} of {stats.totalRequests} vetting request{stats.totalRequests !== 1 ? "s" : ""} completed
              {stats.inProgress > 0 && ` · ${stats.inProgress} currently in progress`}
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Recent requests */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-card-border">
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
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                      {req.trustScore != null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getTrustScoreBg(req.trustScore)}`}>
                          {req.trustScore}/100
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-card rounded-xl border border-card-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Activity</h2>
              {activity.length > 0 && (
                <span className="text-xs text-muted-foreground">{activity.length} events</span>
              )}
            </div>
            <div className="overflow-y-auto max-h-72">
              {loading ? (
                <div className="px-5 py-8 text-center text-muted-foreground text-xs">Loading…</div>
              ) : activity.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activity.map(item => {
                    const href = activityLink(item);
                    const content = (
                      <div className="flex gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${activityBg(item.type)}`}>
                          {activityIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-snug">{item.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(item.createdAt)}</p>
                        </div>
                      </div>
                    );
                    return href ? (
                      <Link key={item.id} href={href}>{content}</Link>
                    ) : (
                      <div key={item.id}>{content}</div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { href: "/vetting-requests/new", icon: ClipboardList, label: "New Vetting Request", desc: "Submit a worker for background check" },
            { href: "/workers", icon: Users, label: "Browse Verified Workers", desc: "View our verified worker directory" },
            { href: "/staff", icon: Shield, label: "Manage My Staff", desc: "View and track your household staff" },
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
