import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg } from "@/lib/utils";
import {
  Users, ClipboardList, Shield, Search,
  ChevronRight, X, Save, Bell, FileEdit, CheckCircle, Loader2, BarChart3, TrendingUp, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

interface AnalyticsData {
  months: { month: string; label: string; requests: number; completed: number; revenue: number }[];
  packageBreakdown: { name: string; slug: string; total: number; completed: number }[];
  totalRevenue: number;
}

interface AdminRequest {
  id: number;
  workerName: string;
  workerRole: string;
  workerIdNumber: string;
  workerPhone: string | null;
  workerEmail: string | null;
  status: string;
  packageName: string;
  priceKsh: number;
  trustScore: number | null;
  reportId: number | null;
  adminNotes: string | null;
  employerName: string;
  employerEmail: string;
  employerPhone: string | null;
  employerNeighbourhood: string | null;
  createdAt: string;
}

interface AdminReport {
  id: number;
  vettingRequestId: number;
  workerName: string;
  workerRole: string;
  packageName: string;
  overallTrustScore: number;
  scoreBreakdown: Record<string, number | null>;
  identityVerified: boolean;
  dciCertificateStatus: string;
  flags: string[];
  summary: string;
  createdAt: string;
  employerName: string;
  employerEmail: string;
}

interface AdminStats {
  totalRequests: number;
  completed: number;
  inProgress: number;
  pendingPayment: number;
  totalRevenue: number;
  totalUsers: number;
}

interface EmployerRecord {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  neighbourhood: string | null;
  createdAt: string;
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  totalSpendKsh: number;
  lastRequestAt: string | null;
}

function DetailDrawer({
  req,
  token,
  onClose,
  onUpdated,
}: {
  req: AdminRequest;
  token: string | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [notes, setNotes] = useState(req.adminNotes ?? "");
  const [trustOverride, setTrustOverride] = useState(req.trustScore?.toString() ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [notifying, setNotifying] = useState(false);

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await apiFetch(`/admin/requests/${req.id}/notes`, {
        method: "PATCH", token,
        body: { adminNotes: notes },
      });
      onUpdated();
      toast({ title: "Notes saved" });
    } catch {
      toast({ title: "Failed to save notes", variant: "destructive" });
    }
    finally { setSavingNotes(false); }
  }

  async function saveReport() {
    if (!req.reportId) return;
    setSavingReport(true);
    const score = parseInt(trustOverride, 10);
    try {
      await apiFetch(`/admin/reports/${req.reportId}`, {
        method: "PATCH", token,
        body: { overallTrustScore: isNaN(score) ? undefined : score },
      });
      onUpdated();
      toast({ title: "Trust score updated" });
    } catch {
      toast({ title: "Failed to update trust score", variant: "destructive" });
    }
    finally { setSavingReport(false); }
  }

  async function notifyEmployer() {
    setNotifying(true);
    try {
      const res = await apiFetch<{ sent: boolean; message: string }>(`/admin/requests/${req.id}/notify`, {
        method: "POST", token, body: {},
      });
      toast({ title: "Email sent", description: res.message });
    } catch (e: any) {
      toast({ title: "Failed to send email", description: e.message || "Unknown error", variant: "destructive" });
    }
    finally { setNotifying(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">{req.workerName}</h2>
            <p className="text-xs text-gray-500">{req.workerRole} · Request #{req.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(req.status)}`}>
              {getStatusLabel(req.status)}
            </span>
            {req.trustScore != null && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${getTrustScoreBg(req.trustScore)}`}>
                Score: {req.trustScore}/100
              </span>
            )}
          </div>

          {/* Worker info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Worker Details</h3>
            <InfoRow label="Name" value={req.workerName} />
            <InfoRow label="Role" value={req.workerRole} />
            <InfoRow label="ID Number" value={req.workerIdNumber} />
            {req.workerPhone && <InfoRow label="Phone" value={req.workerPhone} />}
            {req.workerEmail && <InfoRow label="Email" value={req.workerEmail} />}
          </div>

          {/* Employer info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Employer</h3>
            <InfoRow label="Name" value={req.employerName} />
            <InfoRow label="Email" value={req.employerEmail} />
            {req.employerPhone && <InfoRow label="Phone" value={req.employerPhone} />}
            {req.employerNeighbourhood && <InfoRow label="Area" value={req.employerNeighbourhood} />}
          </div>

          {/* Package info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Package</h3>
            <InfoRow label="Package" value={req.packageName} />
            <InfoRow label="Price" value={formatKsh(req.priceKsh)} />
            <InfoRow label="Submitted" value={formatDate(req.createdAt)} />
          </div>

          {/* Trust score override (only if report exists) */}
          {req.reportId && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <FileEdit className="w-3.5 h-3.5" /> Override Trust Score
              </h3>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={0} max={100}
                  value={trustOverride}
                  onChange={e => setTrustOverride(e.target.value)}
                  className="w-24"
                  placeholder="0–100"
                />
                <Button size="sm" onClick={saveReport} disabled={savingReport} className="gap-1.5">
                  {savingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
                </div>
              <Link href={`/reports?requestId=${req.id}`} className="inline-block mt-2 text-xs text-blue-600 hover:underline">
                View full report →
              </Link>
            </div>
          )}

          {/* Admin notes */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ops Notes</h3>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={4}
              placeholder="Internal notes visible only to ops team…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" onClick={saveNotes} disabled={savingNotes} className="gap-1.5">
                {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Notes
              </Button>
            </div>
          </div>

          {/* Notify employer */}
          {req.status === "completed" && req.reportId && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notifications</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={notifyEmployer}
                disabled={notifying}
                className="gap-1.5"
              >
                {notifying
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Bell className="w-3.5 h-3.5" />}
                Re-send Report Email
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-800 font-medium text-right">{value}</span>
    </div>
  );
}

export default function Admin() {
  const { token, isOps } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<AdminRequest | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "analytics" | "reports" | "employers">("requests");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [employers, setEmployers] = useState<EmployerRecord[]>([]);

  async function load() {
    try {
      const [statsData, reqData] = await Promise.all([
        apiFetch<AdminStats>("/admin/stats", { token }),
        apiFetch<{ requests: AdminRequest[] }>("/admin/requests", { token }),
      ]);
      setStats(statsData);
      setRequests(reqData.requests);
    } catch {}
    finally { setLoading(false); }
  }

  async function loadAnalytics() {
    try {
      const data = await apiFetch<AnalyticsData>("/admin/analytics", { token });
      setAnalytics(data);
    } catch {}
  }

  async function loadReports() {
    try {
      const data = await apiFetch<{ reports: AdminReport[] }>("/admin/reports", { token });
      setReports(data.reports);
    } catch {}
  }

  async function loadEmployers() {
    try {
      const data = await apiFetch<{ employers: EmployerRecord[] }>("/admin/employers", { token });
      setEmployers(data.employers);
    } catch {}
  }

  useEffect(() => { load(); }, [token]);
  useEffect(() => { if (activeTab === "analytics") loadAnalytics(); }, [activeTab, token]);
  useEffect(() => { if (activeTab === "reports") loadReports(); }, [activeTab, token]);
  useEffect(() => { if (activeTab === "employers") loadEmployers(); }, [activeTab, token]);

  async function updateStatus(id: number, status: string) {
    setUpdatingId(id);
    try {
      await apiFetch(`/admin/requests/${id}/status`, {
        method: "PATCH", token,
        body: { status },
      });
      await load();
      toast({ title: "Status updated", description: `Request #${id} → ${getStatusLabel(status)}` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
    finally { setUpdatingId(null); }
  }

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.workerName.toLowerCase().includes(q) || r.employerName.toLowerCase().includes(q) || r.workerIdNumber?.includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (!isOps) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">Access restricted.</div>
      </AppLayout>
    );
  }

  const statCards = [
    { label: "Total Requests", value: stats?.totalRequests ?? 0 },
    { label: "Completed", value: stats?.completed ?? 0 },
    { label: "In Progress", value: stats?.inProgress ?? 0 },
    { label: "Pending Payment", value: stats?.pendingPayment ?? 0 },
    { label: "Total Revenue", value: stats ? formatKsh(stats.totalRevenue) : "—" },
    { label: "Total Users", value: stats?.totalUsers ?? 0 },
  ];

  return (
    <AppLayout>
      {drawer && (
        <DetailDrawer
          req={drawer}
          token={token}
          onClose={() => setDrawer(null)}
          onUpdated={() => { load(); setDrawer(prev => prev ? requests.find(r => r.id === prev.id) ?? null : null); }}
        />
      )}

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage all vetting requests and operations</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["requests", "analytics", "reports", "employers"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab === "requests" ? <ClipboardList className="w-3.5 h-3.5" />
                  : tab === "analytics" ? <BarChart3 className="w-3.5 h-3.5" />
                  : tab === "reports" ? <FileText className="w-3.5 h-3.5" />
                  : <Users className="w-3.5 h-3.5" />}
                {tab === "requests" ? "Requests"
                  : tab === "analytics" ? "Analytics"
                  : tab === "reports" ? "Reports"
                  : "Employers"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {statCards.map(({ label, value }) => (
            <div key={label} className="bg-card rounded-xl border border-card-border p-4">
              <div className="text-xl font-bold text-foreground">{loading ? "—" : value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Analytics tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6 mb-8">
            {!analytics ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading analytics…</div>
            ) : (
              <>
                {/* Monthly chart */}
                <div className="bg-card rounded-xl border border-card-border p-6">
                  <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Monthly Activity (Last 6 Months)
                  </h3>
                  <p className="text-xs text-muted-foreground mb-5">Requests submitted vs. completed</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.months} barSize={18} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={(v: number, name: string) => [
                          name === "revenue" ? `Ksh ${v.toLocaleString()}` : v,
                          name === "requests" ? "Submitted" : name === "completed" ? "Completed" : "Revenue",
                        ]}
                      />
                      <Legend formatter={v => v === "requests" ? "Submitted" : v === "completed" ? "Completed" : "Revenue"} />
                      <Bar dataKey="requests" fill="#e0f2fe" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue chart */}
                <div className="bg-card rounded-xl border border-card-border p-6">
                  <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Monthly Revenue (Ksh)
                  </h3>
                  <p className="text-xs text-muted-foreground mb-5">
                    Total revenue: <strong>{formatKsh(analytics.totalRevenue)}</strong>
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={analytics.months}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={(v: number) => [`Ksh ${v.toLocaleString()}`, "Revenue"]}
                      />
                      <Line dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Package breakdown */}
                <div className="bg-card rounded-xl border border-card-border p-6">
                  <h3 className="font-semibold text-foreground mb-5">Package Breakdown</h3>
                  <div className="space-y-4">
                    {analytics.packageBreakdown.map(pkg => {
                      const max = Math.max(...analytics.packageBreakdown.map(p => p.total), 1);
                      return (
                        <div key={pkg.slug}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-medium text-foreground">{pkg.name}</span>
                            <span className="text-muted-foreground">{pkg.total} total · {pkg.completed} completed</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${(pkg.total / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Reports tab */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                No reports generated yet. Use the Ops workflow to complete vetting requests.
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-card-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Worker</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Package</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Trust Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Employer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Checks</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => {
                      const recommendation = report.overallTrustScore >= 80 ? "hire" : report.overallTrustScore >= 60 ? "caution" : "do_not_hire";
                      const recBadge = {
                        hire: "bg-emerald-100 text-emerald-700",
                        caution: "bg-amber-100 text-amber-700",
                        do_not_hire: "bg-red-100 text-red-700",
                      }[recommendation];
                      const recLabel = { hire: "Safe to Hire", caution: "Caution", do_not_hire: "Do Not Hire" }[recommendation];
                      const breakdown = report.scoreBreakdown as Record<string, number | null>;
                      return (
                        <tr key={report.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{report.workerName}</p>
                            <p className="text-xs text-muted-foreground">{report.workerRole}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground">{report.packageName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${getTrustScoreBg(report.overallTrustScore)}`}>
                                {report.overallTrustScore}/100
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium w-fit ${recBadge}`}>{recLabel}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-sm text-foreground">{report.employerName}</p>
                            <p className="text-xs text-muted-foreground">{report.employerEmail}</p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${report.identityVerified ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                {report.identityVerified ? "ID ✓" : "ID ✗"}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${report.dciCertificateStatus === "verified" ? "bg-emerald-100 text-emerald-700" : report.dciCertificateStatus === "failed" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>
                                DCI: {report.dciCertificateStatus}
                              </span>
                              {report.flags.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                  {report.flags.length} flag{report.flags.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {breakdown && (
                              <div className="mt-1 flex gap-1 text-[10px] text-muted-foreground">
                                {Object.entries(breakdown).filter(([, v]) => v != null).map(([k, v]) => (
                                  <span key={k} className="font-mono">{v}</span>
                                )).reduce((acc: React.ReactNode[], el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`}>·</span>, el], [])}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{formatDate(report.createdAt)}</td>
                          <td className="px-4 py-3">
                            <Link href={`/reports?requestId=${report.vettingRequestId}`}>
                              <Button size="sm" variant="outline" className="gap-1.5 h-8">
                                <FileText className="w-3.5 h-3.5" /> View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Requests tab: filters + table */}
        {activeTab === "requests" && (
        <>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search worker, employer, or ID…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-xl border border-card-border overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Worker</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Employer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Package</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(req => (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary text-xs font-bold">{req.workerName.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{req.workerName}</p>
                            <p className="text-xs text-muted-foreground">{req.workerRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-foreground">{req.employerName}</p>
                        <p className="text-xs text-muted-foreground">{req.employerEmail}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs">{req.packageName}</p>
                        <p className="text-xs font-medium">{formatKsh(req.priceKsh)}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {req.trustScore != null ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getTrustScoreBg(req.trustScore)}`}>
                            {req.trustScore}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(req.status)}`}>
                          {getStatusLabel(req.status)}
                        </span>
                        {req.adminNotes && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-24">📝 {req.adminNotes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Select
                            value={req.status}
                            onValueChange={v => updateStatus(req.id, v)}
                            disabled={updatingId === req.id}
                          >
                            <SelectTrigger className="h-7 text-xs w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending_payment">Pending Payment</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setDrawer(req)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}

        {/* Employers tab */}
        {activeTab === "employers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {employers.length} registered employer{employers.length !== 1 ? "s" : ""}
              </p>
            </div>
            {employers.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                No employer accounts registered yet.
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-card-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Employer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Requests</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Total Spend</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Joined</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Last Request</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employers.map(emp => (
                        <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-primary text-xs font-bold">{emp.name.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{emp.name}</p>
                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                                {emp.phone && <p className="text-xs text-muted-foreground">{emp.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground">{emp.neighbourhood ?? "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-foreground">{emp.totalRequests}</span>
                              <div className="flex gap-1.5 flex-wrap">
                                {emp.completedRequests > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                    {emp.completedRequests} done
                                  </span>
                                )}
                                {emp.inProgressRequests > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                    {emp.inProgressRequests} active
                                  </span>
                                )}
                                {emp.pendingRequests > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                    {emp.pendingRequests} pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-sm font-semibold text-foreground">{formatKsh(emp.totalSpendKsh)}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                            {formatDate(emp.createdAt)}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                            {emp.lastRequestAt ? formatDate(emp.lastRequestAt) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
