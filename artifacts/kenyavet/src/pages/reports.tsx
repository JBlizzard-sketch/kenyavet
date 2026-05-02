import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, getTrustScoreBg, getTrustScoreLabel } from "@/lib/utils";
import { FileText, Download, Shield, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Report {
  id: number;
  requestId: number;
  workerName: string;
  workerRole: string;
  trustScore: number;
  summary: string | null;
  recommendation: string | null;
  identityStatus: string | null;
  dciStatus: string | null;
  referenceStatus: string | null;
  socialMediaStatus: string | null;
  addressStatus: string | null;
  createdAt: string;
}

const statusIcon: Record<string, { icon: React.ElementType; color: string }> = {
  passed: { icon: CheckCircle, color: "text-emerald-600" },
  failed: { icon: AlertCircle, color: "text-red-600" },
  pending: { icon: AlertCircle, color: "text-muted-foreground" },
  not_applicable: { icon: Shield, color: "text-muted-foreground" },
};

function StatusRow({ label, status }: { label: string; status: string | null }) {
  if (!status || status === "not_applicable") return null;
  const cfg = statusIcon[status] ?? statusIcon.pending;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1.5 text-sm font-medium capitalize ${cfg.color}`}>
        <Icon className="w-4 h-4" />
        {status.replace("_", " ")}
      </span>
    </div>
  );
}

export default function Reports() {
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ reports: Report[] }>("/reports", { token }).then(d => {
      setReports(d.reports);
      if (d.reports.length > 0) setSelected(d.reports[0]);
    }).catch(() => setReports([])).finally(() => setLoading(false));
  }, [token]);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-foreground">Vetting Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{reports.length} completed report{reports.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No completed reports yet.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Reports list */}
            <div className="space-y-2">
              {reports.map(report => (
                <button
                  key={report.id}
                  onClick={() => setSelected(report)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    selected?.id === report.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary text-xs font-bold">{report.workerName.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{report.workerName}</p>
                      <p className="text-xs text-muted-foreground">{report.workerRole}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getTrustScoreBg(report.trustScore)}`}>
                      {report.trustScore}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(report.createdAt)}</p>
                </button>
              ))}
            </div>

            {/* Report detail */}
            {selected && (
              <div className="lg:col-span-2 bg-card rounded-xl border border-card-border p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-foreground">{selected.workerName}</h2>
                    <p className="text-muted-foreground text-sm">{selected.workerRole} · Report #{selected.id}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getTrustScoreBg(selected.trustScore)} px-4 py-2 rounded-xl`}>
                      {selected.trustScore}/100
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{getTrustScoreLabel(selected.trustScore)}</p>
                  </div>
                </div>

                {/* Trust bar */}
                <div className="mb-6">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${selected.trustScore >= 80 ? "bg-emerald-500" : selected.trustScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${selected.trustScore}%` }}
                    />
                  </div>
                </div>

                {/* Summary */}
                {selected.summary && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Summary</h3>
                    <p className="text-sm text-foreground">{selected.summary}</p>
                  </div>
                )}

                {/* Checks */}
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Verification Checks</h3>
                  <div className="bg-card border border-border rounded-lg px-4">
                    <StatusRow label="Identity Verification" status={selected.identityStatus} />
                    <StatusRow label="DCI Certificate" status={selected.dciStatus} />
                    <StatusRow label="Reference Checks" status={selected.referenceStatus} />
                    <StatusRow label="Social Media Review" status={selected.socialMediaStatus} />
                    <StatusRow label="Physical Address Visit" status={selected.addressStatus} />
                  </div>
                </div>

                {/* Recommendation */}
                {selected.recommendation && (
                  <div className={`rounded-lg p-4 mb-5 ${
                    selected.recommendation === "hire" ? "bg-emerald-50 border border-emerald-200" :
                    selected.recommendation === "caution" ? "bg-amber-50 border border-amber-200" :
                    "bg-red-50 border border-red-200"
                  }`}>
                    <p className={`font-semibold text-sm ${
                      selected.recommendation === "hire" ? "text-emerald-800" :
                      selected.recommendation === "caution" ? "text-amber-800" : "text-red-800"
                    }`}>
                      Recommendation: {selected.recommendation === "hire" ? "✓ Safe to Hire" : selected.recommendation === "caution" ? "⚠ Proceed with Caution" : "✗ Do Not Hire"}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                  <p className="text-xs text-muted-foreground">Report generated {formatDate(selected.createdAt)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
