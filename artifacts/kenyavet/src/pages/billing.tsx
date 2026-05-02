import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatKsh, formatDate } from "@/lib/utils";
import { CreditCard, Receipt, ArrowLeft, TrendingUp, Calendar, Hash, Download } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface Transaction {
  id: number;
  workerName: string;
  workerRole: string;
  packageName: string;
  packageSlug: string;
  priceKsh: number;
  mpesaRef: string;
  paidAt: string;
  status: string;
}

interface BillingHistory {
  totalSpend: number;
  last30DaysSpend: number;
  transactionCount: number;
  transactions: Transaction[];
}

function packageColor(slug: string): string {
  if (slug === "premium") return "bg-violet-100 text-violet-700";
  if (slug === "standard") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

function formatPaidAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default function Billing() {
  const { token } = useAuth();
  const [data, setData] = useState<BillingHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/billing/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kenyavet-billing-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    apiFetch<BillingHistory>("/billing/history", { token })
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load billing history"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold text-foreground">Billing & Payments</h1>
            <p className="text-muted-foreground text-sm mt-0.5">All M-Pesa payments for your vetting requests</p>
          </div>
          {data && data.transactionCount > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          )}
        </div>

        {loading && (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading billing history…</div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100 mb-6">{error}</div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-card rounded-xl border border-card-border p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Total Spend</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{formatKsh(data.totalSpend)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">All time</div>
              </div>

              <div className="bg-card rounded-xl border border-card-border p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Last 30 Days</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{formatKsh(data.last30DaysSpend)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Recent payments</div>
              </div>

              <div className="bg-card rounded-xl border border-card-border p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Transactions</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{data.transactionCount}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Total payments made</div>
              </div>
            </div>

            {/* Transaction list */}
            <div className="bg-card rounded-xl border border-card-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Payment History</h2>
                {data.transactions.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">{data.transactions.length} transaction{data.transactions.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              {data.transactions.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Receipt className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">No payments yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Payments appear here once you complete M-Pesa checkout</p>
                  <Link href="/vetting-requests/new">
                    <button className="mt-4 text-xs text-primary hover:underline font-medium">Submit a vetting request →</button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.transactions.map(tx => (
                    <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <span className="text-emerald-700 text-sm font-bold">{tx.workerName.charAt(0)}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground text-sm truncate">{tx.workerName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${packageColor(tx.packageSlug)}`}>
                            {tx.packageName}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{tx.workerRole}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">M-Pesa ref:</span>
                          <span className="text-xs font-mono font-semibold text-foreground tracking-wide">{tx.mpesaRef}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-emerald-700 text-sm">{formatKsh(tx.priceKsh)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatPaidAt(tx.paidAt)}</p>
                        <Link href={`/receipt/${tx.id}`}>
                          <button className="mt-1.5 text-xs text-primary hover:underline font-medium flex items-center gap-1 ml-auto">
                            <Receipt className="w-3 h-3" /> Receipt
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.transactions.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                All payments processed via M-Pesa Lipa Na M-Pesa. Contact ops@kenyavet.co.ke for any billing queries.
              </p>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
