import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg } from "@/lib/utils";
import { Plus, ClipboardList, Search, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VettingRequest {
  id: number;
  workerName: string;
  workerRole: string;
  workerIdNumber: string;
  status: string;
  packageName: string;
  priceKsh: number;
  trustScore: number | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending_payment", label: "Pending Payment" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function VettingRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<VettingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<{ requests: VettingRequest[] }>("/vetting-requests", { token });
        setRequests(data.requests);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const filtered = requests.filter(r => {
    const matchSearch =
      r.workerName.toLowerCase().includes(search.toLowerCase()) ||
      r.workerRole.toLowerCase().includes(search.toLowerCase()) ||
      r.workerIdNumber.includes(search);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingPaymentCount = requests.filter(r => r.status === "pending_payment").length;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Vetting Requests</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{requests.length} total request{requests.length !== 1 ? "s" : ""}</p>
          </div>
          <Link href="/vetting-requests/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </Link>
        </div>

        {/* Pending payment banner */}
        {pendingPaymentCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-semibold">{pendingPaymentCount} request{pendingPaymentCount !== 1 ? "s" : ""}</span> awaiting M-Pesa payment.
            </p>
            <button
              onClick={() => setStatusFilter("pending_payment")}
              className="text-xs font-medium text-amber-700 underline hover:text-amber-900"
            >
              Filter
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, role, or ID number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-card-border overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {search || statusFilter !== "all" ? "No results match your filters." : "No vetting requests yet."}
              </p>
              {!search && statusFilter === "all" && (
                <Link href="/vetting-requests/new">
                  <Button size="sm" className="mt-4">Submit first request</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Worker</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Package</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Trust Score</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(req => (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary text-xs font-bold">{req.workerName.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{req.workerName}</p>
                            <p className="text-xs text-muted-foreground">{req.workerRole} · ID {req.workerIdNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        <p className="text-xs text-foreground">{req.packageName}</p>
                        <p className="text-xs">{formatKsh(req.priceKsh)}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {req.trustScore != null ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getTrustScoreBg(req.trustScore)}`}>
                            {req.trustScore}/100
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(req.status)}`}>
                          {getStatusLabel(req.status)}
                        </span>
                        {req.status === "pending_payment" && (
                          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                            <Smartphone className="w-3 h-3" /> Pay to start
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{formatDate(req.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/vetting-requests/${req.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
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
