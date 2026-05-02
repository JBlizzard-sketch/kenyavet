import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Shield, CheckCircle, AlertCircle, ExternalLink, Lock } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface PublicReport {
  workerName: string;
  workerRole: string;
  workerPhotoUrl: string | null;
  packageName: string;
  trustScore: number;
  recommendation: string;
  summary: string | null;
  identityStatus: string | null;
  dciStatus: string | null;
  referenceStatus: string | null;
  socialMediaStatus: string | null;
  scoreBreakdown: Record<string, number | null> | null;
  flags: string[];
  createdAt: string;
  sharedBy: string;
  expiresAt: string;
}

function TrustRing({ score }: { score: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const filled = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500 mt-0.5">TRUST SCORE</span>
      </div>
    </div>
  );
}

const STATUS_CFG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  passed: { icon: CheckCircle, color: "text-emerald-600", label: "Passed" },
  failed: { icon: AlertCircle, color: "text-red-500", label: "Failed" },
  pending: { icon: AlertCircle, color: "text-gray-400", label: "Pending" },
};

const REC_CFG = {
  hire: { label: "Safe to Hire", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  caution: { label: "Proceed with Caution", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  do_not_hire: { label: "Do Not Hire", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

function CheckBadge({ label, status, icon }: { label: string; status: string | null; icon: string }) {
  if (!status || status === "not_applicable" || status === "pending") return null;
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-base w-6 shrink-0">{icon}</span>
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <span className={`flex items-center gap-1 text-sm font-medium ${cfg.color}`}>
        <Icon className="w-4 h-4" /> {cfg.label}
      </span>
    </div>
  );
}

export default function ReportPublic() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) return;
    fetch(`${API_BASE}/reports/share/${shareToken}`)
      .then(r => {
        if (!r.ok) throw new Error("expired");
        return r.json();
      })
      .then(setReport)
      .catch(() => setError("This shared report link has expired or is invalid."))
      .finally(() => setLoading(false));
  }, [shareToken]);

  const recCfg = report
    ? (REC_CFG[report.recommendation as keyof typeof REC_CFG] ?? REC_CFG.caution)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      <header className="py-4 px-6 flex items-center justify-between max-w-3xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-emerald-700 hover:opacity-80 transition-opacity">
          <Shield className="w-5 h-5" />
          <span className="font-bold font-serif text-base">KenyaVet</span>
        </Link>
        <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Lock className="w-3 h-3" /> Shared Report
        </span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading report…</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h2 className="font-semibold text-gray-800 mb-2">Link not found</h2>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <Link href="/verify" className="text-sm text-emerald-600 hover:underline inline-flex items-center gap-1">
                Try verifying a worker manually <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {!loading && report && recCfg && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-400" />

              <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-emerald-700 text-2xl font-bold">
                    {report.workerName.charAt(0)}
                  </span>
                </div>
                <h1 className="text-xl font-serif font-bold text-gray-900">{report.workerName}</h1>
                <p className="text-sm text-gray-500">{report.workerRole}</p>
                <p className="text-xs text-gray-400 mt-0.5">{report.packageName}</p>

                <div className="mt-6">
                  <TrustRing score={report.trustScore} />
                </div>

                <div className={`mt-5 inline-block rounded-xl px-6 py-2.5 border ${recCfg.bg}`}>
                  <p className={`text-sm font-semibold ${recCfg.color}`}>{recCfg.label}</p>
                </div>

                <p className="mt-3 text-xs text-gray-400">
                  Shared by <span className="font-medium text-gray-600">{report.sharedBy}</span>
                  {" · "}Expires {new Date(report.expiresAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>

              {report.summary && (
                <div className="px-8 py-5 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Verification Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
                </div>
              )}

              <div className="px-8 py-5 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Verification Checks</p>
                <CheckBadge label="Identity Verification" status={report.identityStatus} icon="🪪" />
                <CheckBadge label="DCI Certificate" status={report.dciStatus} icon="🏛️" />
                <CheckBadge label="Reference Checks" status={report.referenceStatus} icon="📞" />
                <CheckBadge label="Social Media Review" status={report.socialMediaStatus} icon="🌐" />
              </div>

              {report.scoreBreakdown && (
                <div className="px-8 py-5 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Score Breakdown</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Identity", key: "identity", max: 25, icon: "🪪" },
                      { label: "References", key: "references", max: 30, icon: "📞" },
                      { label: "DCI Cert", key: "dciCertificate", max: 20, icon: "🏛️" },
                      { label: "Social", key: "socialMedia", max: 15, icon: "🌐" },
                    ].filter(({ key }) => report.scoreBreakdown?.[key] != null).map(({ label, key, max, icon }) => {
                      const score = report.scoreBreakdown![key] ?? 0;
                      const pct = (score / max) * 100;
                      return (
                        <div key={key} className="bg-gray-50 rounded-lg py-3 px-2 text-center">
                          <div className="text-lg mb-1">{icon}</div>
                          <div className="text-lg font-bold text-gray-800">{score}</div>
                          <div className="text-xs text-gray-400">/{max}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                          <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {report.flags && report.flags.length > 0 && (
                <div className="px-8 py-5 border-b border-gray-100 bg-red-50">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Flags & Concerns
                  </p>
                  <ul className="space-y-1">
                    {report.flags.map((f, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="px-8 py-5 bg-gray-50 text-center">
                <p className="text-xs text-gray-400 mb-3">
                  This report was produced by KenyaVet — Kenya's trusted domestic staff vetting service.
                </p>
                <Link href="/register" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  Vet your own staff with KenyaVet <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
