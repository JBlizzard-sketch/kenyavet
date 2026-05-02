import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg } from "@/lib/utils";
import { Users, ClipboardList, Shield, CheckCircle, TrendingUp, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminRequest {
  id: number;
  workerName: string;
  workerRole: string;
  status: string;
  packageName: string;
  priceKsh: number;
  trustScore: number | null;
  employerName: string;
  employerEmail: string;
  createdAt: string;
}

interface AdminStats {
  totalRequests: number;
  completed: number;
  inProgress: number;
  pendingPayment: number;
  totalRevenue: number;
  totalUsers: number;
}

export default function Admin() {
  const { token, isOps } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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

  useEffect(() => { load(); }, [token]);

  async function updateStatus(id: number, status: string) {
    setUpdatingId(id);
    try {
      await apiFetch(`/admin/requests/${id}/status`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status }),
      });
      await load();
    } catch {}
    finally { setUpdatingId(null); }
  }

  const filtered = requests.filter(r => {
    const matchSearch =
      r.workerName.toLowerCase().includes(search.toLowerCase()) ||
      r.employerName.toLowerCase().includes(search.toLowerCase());
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
    { label: "Total Requests", value: stats?.totalRequests ?? 0, color: "text-blue-600 bg-blue-50" },
    { label: "Completed", value: stats?.completed ?? 0, color: "text-emerald-600 bg-emerald-50" },
    { label: "In Progress", value: stats?.inProgress ?? 0, color: "text-violet-600 bg-violet-50" },
    { label: "Total Revenue", value: stats ? formatKsh(stats.totalRevenue) : "—", color: "text-orange-600 bg-orange-50" },
    { label: "Pending Payment", value: stats?.pendingPayment ?? 0, color: "text-amber-600 bg-amber-50" },
    { label: "Total Users", value: stats?.totalUsers ?? 0, color: "text-pink-600 bg-pink-50" },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage all vetting requests and operations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
          {statCards.map(({ label, value, color }) => (
            <div key={label} className="bg-card rounded-xl border border-card-border p-4">
              <div className="text-xl font-bold text-foreground">{loading ? "—" : value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search worker or employer…" value={search} onChange={e => setSearch(e.target.value)} />
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

        {/* Table */}
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Date</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Action</th>
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
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        <p className="text-foreground text-xs">{req.employerName}</p>
                        <p className="text-xs text-muted-foreground">{req.employerEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
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
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">{formatDate(req.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
