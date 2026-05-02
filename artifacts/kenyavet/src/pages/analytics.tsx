import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { TrendingUp, CheckCircle, CreditCard, Shield, BarChart2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend as PieLegend,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

interface AnalyticsData {
  totals: {
    totalRequests: number;
    completedRequests: number;
    totalSpendingKsh: number;
    avgTrustScore: number | null;
  };
  requestsOverTime: { month: string; count: number; spending: number }[];
  statusBreakdown: { status: string; count: number }[];
  trustScoreDistribution: { range: string; count: number }[];
  topRoles: { role: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  "Completed": "#10b981",
  "In Progress": "#3b82f6",
  "Pending Review": "#f59e0b",
  "Pending Payment": "#6b7280",
  "Cancelled": "#ef4444",
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899"];

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyBar() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <BarChart2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">No data yet</p>
      <p className="text-xs text-muted-foreground/70 mt-1">Submit vetting requests to see analytics</p>
    </div>
  );
}

// Custom tooltip for line/bar charts
function ChartTooltip({ active, payload, label, prefix = "", suffix = "" }: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
  prefix?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{prefix}{p.value.toLocaleString()}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { token, user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch<AnalyticsData>("/analytics", { token })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const isAdmin = user?.role === "admin" || user?.role === "ops";

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded-lg" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-72 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="p-6 text-sm text-muted-foreground">Failed to load analytics.</div>
      </AppLayout>
    );
  }

  const hasTimeData = data.requestsOverTime.some(m => m.count > 0);
  const hasStatusData = data.statusBreakdown.length > 0 && data.statusBreakdown.some(s => s.count > 0);
  const hasTrustData = data.trustScoreDistribution.some(b => b.count > 0);
  const hasRoleData = data.topRoles.length > 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            {isAdmin ? "Platform Analytics" : "My Analytics"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin
              ? "Overview of all vetting activity across KenyaVet"
              : "Insights into your vetting history and spending"}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Total Requests"
            value={data.totals.totalRequests.toLocaleString()}
            sub={`${data.totals.completedRequests} completed`}
            color="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          />
          <StatCard
            icon={CheckCircle}
            label="Completion Rate"
            value={
              data.totals.totalRequests > 0
                ? `${Math.round((data.totals.completedRequests / data.totals.totalRequests) * 100)}%`
                : "—"
            }
            sub={`${data.totals.completedRequests} of ${data.totals.totalRequests} requests`}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          />
          <StatCard
            icon={CreditCard}
            label="Total Spent"
            value={`KSh ${data.totals.totalSpendingKsh.toLocaleString()}`}
            sub={
              data.totals.completedRequests > 0
                ? `~KSh ${Math.round(data.totals.totalSpendingKsh / data.totals.completedRequests).toLocaleString()} avg`
                : undefined
            }
            color="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
          />
          <StatCard
            icon={Shield}
            label="Avg Trust Score"
            value={data.totals.avgTrustScore != null ? `${data.totals.avgTrustScore}` : "—"}
            sub={data.totals.avgTrustScore != null
              ? data.totals.avgTrustScore >= 80 ? "Excellent portfolio" : data.totals.avgTrustScore >= 60 ? "Good portfolio" : "Needs attention"
              : "No completed reports"}
            color={
              data.totals.avgTrustScore == null
                ? "bg-muted text-muted-foreground"
                : data.totals.avgTrustScore >= 80
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                : data.totals.avgTrustScore >= 60
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
            }
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Requests over time — wider */}
          <div className="lg:col-span-3 bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4 text-sm">Requests Over Time</h2>
            {hasTimeData ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.requestsOverTime} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip suffix=" requests" />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone" dataKey="count" name="Requests"
                    stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyBar />}
          </div>

          {/* Status breakdown — pie */}
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4 text-sm">Status Breakdown</h2>
            {hasStatusData ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={44}
                    paddingAngle={2}
                  >
                    {data.statusBreakdown.map((entry, i) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <PieTooltip
                    formatter={(value: number, name: string) => [`${value} request${value !== 1 ? "s" : ""}`, name]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                    }}
                  />
                  <PieLegend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBar />}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Trust score distribution */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-1 text-sm">Trust Score Distribution</h2>
            <p className="text-xs text-muted-foreground mb-4">Workers across score bands</p>
            {hasTrustData ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.trustScoreDistribution} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip suffix=" workers" />} />
                  <Bar dataKey="count" name="Workers" radius={[4, 4, 0, 0]}>
                    {data.trustScoreDistribution.map((entry, i) => {
                      const fill =
                        entry.range === "81–100" ? "#10b981" :
                        entry.range === "61–80" ? "#22d3ee" :
                        entry.range === "41–60" ? "#f59e0b" :
                        entry.range === "21–40" ? "#f97316" : "#ef4444";
                      return <Cell key={i} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBar />}
          </div>

          {/* Spending over time */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-1 text-sm">Monthly Spending</h2>
            <p className="text-xs text-muted-foreground mb-4">KSh paid for completed verifications</p>
            {hasTimeData ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.requestsOverTime} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)} />
                  <Tooltip content={<ChartTooltip prefix="KSh " />} />
                  <Bar dataKey="spending" name="KSh Spent" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBar />}
          </div>
        </div>

        {/* Top roles */}
        {hasRoleData && (
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-1 text-sm">Top Vetted Roles</h2>
            <p className="text-xs text-muted-foreground mb-5">Most common domestic staff roles submitted for vetting</p>
            <div className="space-y-3">
              {data.topRoles.map((role, i) => {
                const max = data.topRoles[0].count;
                const pct = Math.round((role.count / max) * 100);
                return (
                  <div key={role.role} className="flex items-center gap-3">
                    <span className="w-5 text-xs text-muted-foreground text-right shrink-0">{i + 1}</span>
                    <span className="w-36 text-sm text-foreground truncate shrink-0">{role.role}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{role.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
