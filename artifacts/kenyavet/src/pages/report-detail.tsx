import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, getTrustScoreBg, getTrustScoreLabel } from "@/lib/utils";
import {
  ArrowLeft, Printer, Shield, CheckCircle, AlertCircle, QrCode, FileText,
  User, Briefcase, Hash, Phone, MapPin, Share2, Copy, Check, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import QrCard from "@/components/QrCard";

interface ScoreBreakdown {
  identity: number | null;
  references: number | null;
  dciCertificate: number | null;
  socialMedia: number | null;
  addressVisit?: number | null;
}

interface ReportFull {
  id: number;
  requestId: number;
  workerName: string;
  workerRole: string;
  workerPhotoUrl: string | null;
  packageName: string;
  trustScore: number;
  scoreBreakdown: ScoreBreakdown | null;
  summary: string | null;
  recommendation: string | null;
  identityStatus: string | null;
  dciStatus: string | null;
  referenceStatus: string | null;
  socialMediaStatus: string | null;
  addressStatus: string | null;
  socialMediaSummary: string | null;
  referencesSummary: string | null;
  employerName: string;
  workerIdNumber: string;
  workerPhone: string | null;
  flags: string[];
  createdAt: string;
}

function TrustRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

const STATUS_CFG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  passed: { icon: CheckCircle, color: "text-emerald-600", label: "Passed" },
  failed: { icon: AlertCircle, color: "text-red-600", label: "Failed" },
  pending: { icon: AlertCircle, color: "text-muted-foreground", label: "Pending" },
  not_applicable: { icon: Shield, color: "text-muted-foreground", label: "N/A" },
};

function CheckRow({ label, status, score, maxScore, icon }: {
  label: string; status: string | null; score?: number | null; maxScore?: number; icon: string;
}) {
  if (!status || status === "not_applicable") return null;
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center py-3 border-b border-border last:border-0 gap-3">
      <span className="text-lg w-6 shrink-0">{icon}</span>
      <span className="text-sm text-foreground flex-1">{label}</span>
      {score != null && maxScore != null && (
        <span className="text-xs font-mono text-muted-foreground">{score}/{maxScore}</span>
      )}
      <span className={`flex items-center gap-1.5 text-sm font-medium shrink-0 ${cfg.color}`}>
        <Icon className="w-4 h-4" /> {cfg.label}
      </span>
    </div>
  );
}

const REC_CFG = {
  hire: { label: "Safe to Hire", color: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200" },
  caution: { label: "Proceed with Caution", color: "text-amber-800", bg: "bg-amber-50 border-amber-200" },
  do_not_hire: { label: "Do Not Hire", color: "text-red-800", bg: "bg-red-50 border-red-200" },
};

function PrintStyle() {
  return (
    <style>{`
      @media print {
        .no-print { display: none !important; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  );
}

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [report, setReport] = useState<ReportFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<ReportFull>(`/reports/${id}`, { token })
      .then(setReport)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function handleShare() {
    if (!id || !token) return;
    setSharing(true);
    try {
      const { shareToken } = await apiFetch<{ shareToken: string; expiresAt: string }>(
        `/reports/${id}/share`, { token, method: "POST" }
      );
      const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
      setShareUrl(`${base}/r/${shareToken}`);
    } catch {
      /* noop */
    } finally {
      setSharing(false);
    }
  }

  function copyShareUrl() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <AppLayout><div className="p-6 text-muted-foreground text-sm">Loading report…</div></AppLayout>;
  if (notFound || !report) return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-lg font-semibold text-foreground mb-1">Report not found</p>
        <p className="text-sm text-muted-foreground mb-6">This report may not exist or you may not have access.</p>
        <Link href="/reports"><Button variant="outline">Back to Reports</Button></Link>
      </div>
    </AppLayout>
  );

  const breakdown = report.scoreBreakdown;
  const recCfg = REC_CFG[report.recommendation as keyof typeof REC_CFG] ?? REC_CFG.caution;

  return (
    <AppLayout>
      <PrintStyle />
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back nav */}
        <Link href="/reports">
          <button className="no-print flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
        </Link>

        {/* Print header (hidden on screen) */}
        <div className="hidden print:flex items-center gap-3 mb-8 pb-6 border-b-2 border-gray-200">
          <Shield className="w-8 h-8 text-emerald-700" />
          <div>
            <h1 className="text-2xl font-bold text-emerald-700">KenyaVet</h1>
            <p className="text-sm text-gray-500">Domestic Staff Background Verification — Confidential Report</p>
          </div>
          <div className="ml-auto text-right text-sm text-gray-500">
            <p>Report #{report.id}</p>
            <p>Generated: {formatDate(report.createdAt)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Trust score card */}
            <div className="bg-card rounded-xl border border-card-border p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary text-2xl font-bold">{report.workerName.charAt(0)}</span>
              </div>
              <h2 className="text-lg font-serif font-bold text-foreground">{report.workerName}</h2>
              <p className="text-sm text-muted-foreground">{report.workerRole}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{report.packageName}</p>

              <div className="mt-5 flex justify-center">
                <TrustRing score={report.trustScore} />
              </div>
              <p className="text-sm font-semibold text-foreground mt-2">{getTrustScoreLabel(report.trustScore)}</p>

              <div className={`mt-3 rounded-lg px-4 py-2.5 border ${recCfg.bg}`}>
                <p className={`text-sm font-semibold ${recCfg.color}`}>{recCfg.label}</p>
              </div>
            </div>

            {/* Worker details card */}
            <div className="bg-card rounded-xl border border-card-border p-4 space-y-2.5 text-sm">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Worker Details</h3>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="text-foreground">{report.workerName}</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span>{report.workerRole}</span>
              </div>
              {report.workerIdNumber && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono text-xs">{report.workerIdNumber}</span>
                </div>
              )}
              {report.workerPhone && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{report.workerPhone}</span>
                </div>
              )}
              {report.employerName && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>Client: {report.employerName}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="no-print flex flex-col gap-2">
              <Button
                variant="default"
                className="gap-2 w-full"
                onClick={async () => {
                  const { API_BASE } = await import("@/lib/api");
                  const storedToken = localStorage.getItem("kenyavet_token");
                  const a = document.createElement("a");
                  a.href = `${API_BASE}/reports/${report.id}/pdf`;
                  // Fetch with auth and force download
                  const resp = await fetch(a.href, { headers: { Authorization: `Bearer ${storedToken}` } });
                  if (!resp.ok) return;
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(blob);
                  a.href = url;
                  a.download = `KenyaVet_Report_${report.workerName.replace(/\s+/g, "_")}_${report.id}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4" /> Download PDF Report
              </Button>
              <Button variant="outline" className="gap-2 w-full" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Print / Save PDF
              </Button>
              <Button variant="outline" className="gap-2 w-full" onClick={() => setShowQr(true)}>
                <QrCode className="w-4 h-4" /> QR Certificate Card
              </Button>
              {!shareUrl ? (
                <Button variant="outline" className="gap-2 w-full" onClick={handleShare} disabled={sharing}>
                  {sharing
                    ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Generating…</>
                    : <><Share2 className="w-4 h-4" /> Share Report Link</>
                  }
                </Button>
              ) : (
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Shareable link (expires 48 h)</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground outline-none truncate"
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={copyShareUrl}
                      className="shrink-0 p-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors"
                      title="Copy link"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                  <button onClick={() => setShareUrl(null)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    Revoke and hide link
                  </button>
                </div>
              )}
              <Link href={`/vetting-requests/${report.requestId}`}>
                <Button variant="ghost" className="gap-2 w-full text-sm" size="sm">
                  View Vetting Request →
                </Button>
              </Link>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Score breakdown */}
            {breakdown && (
              <div className="bg-card rounded-xl border border-card-border p-5">
                <h3 className="font-semibold text-foreground mb-4">Score Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Identity", score: breakdown.identity, max: 25, icon: "🪪" },
                    { label: "References", score: breakdown.references, max: 30, icon: "📞" },
                    { label: "DCI Cert", score: breakdown.dciCertificate, max: 20, icon: "🏛️" },
                    { label: "Social Media", score: breakdown.socialMedia, max: 15, icon: "🌐" },
                    ...(breakdown.addressVisit != null ? [{ label: "Address", score: breakdown.addressVisit, max: 10, icon: "📍" }] : []),
                  ].filter(s => s.score != null).map(({ label, score, max, icon }) => (
                    <div key={label} className="text-center bg-muted/40 rounded-lg py-3 px-2">
                      <div className="text-xl mb-1">{icon}</div>
                      <div className="text-lg font-bold text-foreground">{score}</div>
                      <div className="text-xs text-muted-foreground">/{max}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                      <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${report.trustScore >= 80 ? "bg-emerald-500" : report.trustScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${((score ?? 0) / max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {report.summary && (
              <div className="bg-card rounded-xl border border-card-border p-5">
                <h3 className="font-semibold text-foreground mb-3">Verification Summary</h3>
                <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
              </div>
            )}

            {/* Verification checks */}
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h3 className="font-semibold text-foreground mb-3">Verification Checks</h3>
              <CheckRow label="Identity Verification" status={report.identityStatus} score={breakdown?.identity} maxScore={25} icon="🪪" />
              <CheckRow label="DCI Certificate" status={report.dciStatus} score={breakdown?.dciCertificate} maxScore={20} icon="🏛️" />
              <CheckRow label="Reference Checks" status={report.referenceStatus} score={breakdown?.references} maxScore={30} icon="📞" />
              <CheckRow label="Social Media Review" status={report.socialMediaStatus} score={breakdown?.socialMedia} maxScore={15} icon="🌐" />
              <CheckRow label="Physical Address Visit" status={report.addressStatus} score={breakdown?.addressVisit} maxScore={10} icon="📍" />
            </div>

            {/* Reference & social details */}
            {(report.referencesSummary || report.socialMediaSummary) && (
              <div className="bg-card rounded-xl border border-card-border p-5 space-y-4">
                <h3 className="font-semibold text-foreground">Detailed Findings</h3>
                {report.referencesSummary && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">📞 Reference Checks</p>
                    <p className="text-sm text-foreground">{report.referencesSummary}</p>
                  </div>
                )}
                {report.socialMediaSummary && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">🌐 Social Media Review</p>
                    <p className="text-sm text-foreground">{report.socialMediaSummary}</p>
                  </div>
                )}
              </div>
            )}

            {/* Flags */}
            {report.flags && report.flags.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Flags & Concerns
                </h3>
                <ul className="space-y-1">
                  {report.flags.map((flag, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span> {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <p className="text-xs text-muted-foreground text-right no-print">
              Report #{report.id} — Generated {formatDate(report.createdAt)} — KenyaVet Confidential
            </p>
          </div>
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
    </AppLayout>
  );
}
