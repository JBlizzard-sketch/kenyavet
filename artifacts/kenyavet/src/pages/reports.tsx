import { useEffect, useState, useRef } from "react";
import { useSearch } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, getTrustScoreBg, getTrustScoreLabel } from "@/lib/utils";
import { FileText, Printer, Shield, AlertCircle, CheckCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import QrCard from "@/components/QrCard";

interface ScoreBreakdown {
  identity: number | null;
  references: number | null;
  dciCertificate: number | null;
  socialMedia: number | null;
  addressVisit?: number | null;
}

interface Report {
  id: number;
  requestId: number;
  workerName: string;
  workerRole: string;
  workerPhotoUrl?: string | null;
  packageName?: string;
  trustScore: number;
  scoreBreakdown?: ScoreBreakdown | null;
  summary: string | null;
  recommendation: string | null;
  identityStatus: string | null;
  dciStatus: string | null;
  referenceStatus: string | null;
  socialMediaStatus: string | null;
  addressStatus: string | null;
  socialMediaSummary?: string | null;
  referencesSummary?: string | null;
  employerName?: string;
  workerIdNumber?: string;
  flags?: string[];
  createdAt: string;
}

const statusIcon: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  passed: { icon: CheckCircle, color: "text-emerald-600", label: "Passed" },
  failed: { icon: AlertCircle, color: "text-red-600", label: "Failed" },
  pending: { icon: AlertCircle, color: "text-muted-foreground", label: "Pending" },
  not_applicable: { icon: Shield, color: "text-muted-foreground", label: "N/A" },
};

function StatusRow({ label, status, maxScore, score }: {
  label: string;
  status: string | null;
  maxScore?: number;
  score?: number | null;
}) {
  if (!status || status === "not_applicable") return null;
  const cfg = statusIcon[status] ?? statusIcon.pending;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {score != null && maxScore != null && (
          <span className="text-xs text-muted-foreground font-mono">{score}/{maxScore}</span>
        )}
        <span className={`flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
          <Icon className="w-4 h-4" />
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

function PrintableReport({ report }: { report: Report }) {
  const breakdown = report.scoreBreakdown;
  const recommendationConfig = {
    hire: { label: "Safe to Hire", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300" },
    caution: { label: "Proceed with Caution", color: "text-amber-700", bg: "bg-amber-50 border-amber-300" },
    do_not_hire: { label: "Do Not Hire", color: "text-red-700", bg: "bg-red-50 border-red-300" },
  }[report.recommendation ?? "caution"] ?? { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted border-border" };

  return (
    <div id="printable-report" className="hidden print:block p-8 max-w-2xl mx-auto font-sans text-black">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-emerald-700" />
            <span className="text-xl font-bold text-emerald-700">KenyaVet</span>
          </div>
          <p className="text-sm text-gray-500">Domestic Staff Background Verification</p>
          <p className="text-xs text-gray-400 mt-1">kenyavet.co.ke · info@kenyavet.co.ke</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Report #{report.id}</p>
          <p className="text-xs text-gray-500">Generated: {formatDate(report.createdAt)}</p>
          {report.employerName && <p className="text-xs text-gray-500">Client: {report.employerName}</p>}
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">{report.workerName}</h1>
      <p className="text-gray-500 mb-6">{report.workerRole} · {report.packageName}</p>

      {/* Trust Score */}
      <div className="flex items-center gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl font-black text-gray-900">{report.trustScore}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Trust Score</div>
          <div className="text-sm font-semibold text-gray-700 mt-0.5">{getTrustScoreLabel(report.trustScore)}</div>
        </div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${report.trustScore >= 80 ? "bg-emerald-500" : report.trustScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${report.trustScore}%` }}
            />
          </div>
          {breakdown && (
            <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
              {breakdown.identity != null && <div><div className="font-bold">{breakdown.identity}/25</div><div className="text-gray-500">Identity</div></div>}
              {breakdown.references != null && <div><div className="font-bold">{breakdown.references}/30</div><div className="text-gray-500">References</div></div>}
              {breakdown.dciCertificate != null && <div><div className="font-bold">{breakdown.dciCertificate}/20</div><div className="text-gray-500">DCI</div></div>}
              {breakdown.socialMedia != null && <div><div className="font-bold">{breakdown.socialMedia}/15</div><div className="text-gray-500">Social</div></div>}
            </div>
          )}
        </div>
      </div>

      {/* Recommendation */}
      <div className={`border rounded-lg p-4 mb-6 ${recommendationConfig.bg}`}>
        <p className={`font-bold text-lg ${recommendationConfig.color}`}>
          Recommendation: {recommendationConfig.label}
        </p>
      </div>

      {/* Summary */}
      {report.summary && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Verification Summary</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
        </div>
      )}

      {/* Checks */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Verification Results</h2>
        <table className="w-full text-sm border-collapse">
          <tbody>
            {[
              { label: "Identity Verification", status: report.identityStatus },
              { label: "DCI Certificate", status: report.dciStatus },
              { label: "Reference Checks", status: report.referenceStatus },
              { label: "Social Media Review", status: report.socialMediaStatus },
            ].map(({ label, status }) => status && status !== "not_applicable" ? (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-2 text-gray-600">{label}</td>
                <td className="py-2 text-right font-semibold capitalize">{status}</td>
              </tr>
            ) : null)}
          </tbody>
        </table>
      </div>

      {/* References */}
      {report.referencesSummary && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-1">Reference Checks</h2>
          <p className="text-sm text-gray-700">{report.referencesSummary}</p>
        </div>
      )}

      {/* Social Media */}
      {report.socialMediaSummary && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-1">Social Media Review</h2>
          <p className="text-sm text-gray-700">{report.socialMediaSummary}</p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
        <span>KenyaVet Report #{report.id} — Confidential</span>
        <span>Generated {formatDate(report.createdAt)}</span>
      </div>
    </div>
  );
}

function ReportDetail({ report }: { report: Report }) {
  const breakdown = report.scoreBreakdown;
  const [showQr, setShowQr] = useState(false);
  const recommendationConfig = {
    hire: { label: "✓ Safe to Hire", color: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200" },
    caution: { label: "⚠ Proceed with Caution", color: "text-amber-800", bg: "bg-amber-50 border-amber-200" },
    do_not_hire: { label: "✗ Do Not Hire", color: "text-red-800", bg: "bg-red-50 border-red-200" },
  }[report.recommendation ?? "caution"] ?? { label: "—", color: "text-muted-foreground", bg: "bg-muted" };

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <PrintableReport report={report} />
      <div className="lg:col-span-2 bg-card rounded-xl border border-card-border p-6 print:hidden">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-foreground">{report.workerName}</h2>
            <p className="text-muted-foreground text-sm">{report.workerRole} · Report #{report.id}</p>
            {report.packageName && <p className="text-xs text-muted-foreground">{report.packageName}</p>}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getTrustScoreBg(report.trustScore)} px-4 py-2 rounded-xl`}>
              {report.trustScore}/100
            </div>
            <p className="text-xs text-muted-foreground mt-1">{getTrustScoreLabel(report.trustScore)}</p>
          </div>
        </div>

        {/* Trust bar */}
        <div className="mb-6">
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${report.trustScore >= 80 ? "bg-emerald-500" : report.trustScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${report.trustScore}%` }}
            />
          </div>
        </div>

        {/* Score breakdown */}
        {breakdown && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Identity", score: breakdown.identity, max: 25 },
              { label: "References", score: breakdown.references, max: 30 },
              { label: "DCI Cert", score: breakdown.dciCertificate, max: 20 },
              { label: "Social", score: breakdown.socialMedia, max: 15 },
            ].filter(s => s.score != null).map(({ label, score, max }) => (
              <div key={label} className="text-center bg-muted/40 rounded-lg py-3 px-2">
                <div className="text-lg font-bold text-foreground">{score}</div>
                <div className="text-xs text-muted-foreground">/{max}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${((score ?? 0) / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {report.summary && (
          <div className="bg-muted/50 rounded-lg p-4 mb-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Summary</h3>
            <p className="text-sm text-foreground">{report.summary}</p>
          </div>
        )}

        {/* Checks */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Verification Checks</h3>
          <div className="bg-card border border-border rounded-lg px-4">
            <StatusRow label="Identity Verification" status={report.identityStatus} score={breakdown?.identity} maxScore={25} />
            <StatusRow label="DCI Certificate" status={report.dciStatus} score={breakdown?.dciCertificate} maxScore={20} />
            <StatusRow label="Reference Checks" status={report.referenceStatus} score={breakdown?.references} maxScore={30} />
            <StatusRow label="Social Media Review" status={report.socialMediaStatus} score={breakdown?.socialMedia} maxScore={15} />
            {report.addressStatus !== "not_applicable" && (
              <StatusRow label="Physical Address Visit" status={report.addressStatus} score={breakdown?.addressVisit} maxScore={10} />
            )}
          </div>
        </div>

        {/* Recommendation */}
        {report.recommendation && (
          <div className={`rounded-lg p-4 mb-5 border ${recommendationConfig.bg}`}>
            <p className={`font-semibold text-sm ${recommendationConfig.color}`}>
              {recommendationConfig.label}
            </p>
          </div>
        )}

        {/* Extra details */}
        {(report.referencesSummary || report.socialMediaSummary) && (
          <div className="space-y-3 mb-5">
            {report.referencesSummary && (
              <div className="bg-muted/30 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">References</h4>
                <p className="text-sm text-foreground">{report.referencesSummary}</p>
              </div>
            )}
            {report.socialMediaSummary && (
              <div className="bg-muted/30 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Social Media</h4>
                <p className="text-sm text-foreground">{report.socialMediaSummary}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print / PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowQr(true)}>
            <QrCode className="w-4 h-4" /> QR Card
          </Button>
          <p className="text-xs text-muted-foreground ml-auto">Report generated {formatDate(report.createdAt)}</p>
        </div>
      </div>

      {showQr && (
        <QrCard
          reportId={report.id}
          workerName={report.workerName}
          workerRole={report.workerRole}
          trustScore={report.trustScore}
          packageName={report.packageName}
          generatedDate={report.createdAt}
          onClose={() => setShowQr(false)}
        />
      )}
    </>
  );
}

export default function Reports() {
  const { token } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const highlightId = params.get("requestId");

  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ reports: Report[] }>("/reports", { token }).then(d => {
      setReports(d.reports);
      const initial = highlightId
        ? d.reports.find(r => r.requestId === parseInt(highlightId, 10)) ?? d.reports[0]
        : d.reports[0];
      if (initial) loadDetail(initial);
    }).catch(() => setReports([])).finally(() => setLoading(false));
  }, [token]);

  async function loadDetail(report: Report) {
    setSelected(report);
    if (report.scoreBreakdown !== undefined) return;
    setDetailLoading(true);
    try {
      const full = await apiFetch<Report>(`/reports/${report.id}`, { token });
      setSelected(full);
      setReports(prev => prev.map(r => r.id === full.id ? full : r));
    } catch {
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto print:p-0 print:max-w-none">
        <div className="mb-6 print:hidden">
          <h1 className="text-2xl font-serif font-bold text-foreground">Vetting Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{reports.length} completed report{reports.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm print:hidden">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center print:hidden">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No completed reports yet.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Reports list */}
            <div className="space-y-2 print:hidden">
              {reports.map(report => (
                <button
                  key={report.id}
                  onClick={() => loadDetail(report)}
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
            {detailLoading ? (
              <div className="lg:col-span-2 flex items-center justify-center py-16 print:hidden">
                <div className="text-muted-foreground text-sm">Loading report…</div>
              </div>
            ) : selected ? (
              <ReportDetail report={selected} />
            ) : null}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
