import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Shield, CheckCircle, QrCode, Search, AlertTriangle, ExternalLink, Printer, Share2 } from "lucide-react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { getTrustScoreBg, getTrustScoreLabel, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PublicReport {
  reportId: number;
  workerName: string;
  workerRole: string;
  workerPhotoUrl: string | null;
  trustScore: number;
  packageName: string;
  badges: string[];
  summary: string;
  flags: string[];
  verifiedAt: string;
  vetCount: number;
}

interface LegacyWorker {
  id: number;
  name: string;
  role: string;
  trustScore: number;
  neighbourhood: string | null;
  yearsExperience: number | null;
  languages: string[] | null;
  badges: string[] | null;
  qrCode: string;
  vetCount: number;
  verifiedAt: string | null;
}

function TrustRing({ score }: { score: number }) {
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const dash = pct * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="relative text-center">
        <div className="text-4xl font-black text-gray-900 leading-none">{score}</div>
        <div className="text-xs text-gray-400 mt-0.5 font-medium">/ 100</div>
      </div>
    </div>
  );
}

function Recommendation({ score }: { score: number }) {
  if (score >= 80) return (
    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-4 py-1.5 text-sm font-semibold">
      <CheckCircle className="w-4 h-4 text-emerald-600" />
      Safe to Hire
    </div>
  );
  if (score >= 60) return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-4 py-1.5 text-sm font-semibold">
      <AlertTriangle className="w-4 h-4 text-amber-500" />
      Hire with Caution
    </div>
  );
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 rounded-full px-4 py-1.5 text-sm font-semibold">
      <AlertTriangle className="w-4 h-4 text-red-500" />
      Do Not Hire
    </div>
  );
}

function VerifyCard({ name, role, score, packageName, badges, flags, summary, reportId, verifiedAt, vetCount }: {
  name: string; role: string; score: number; packageName: string;
  badges: string[]; flags: string[]; summary: string;
  reportId?: number; verifiedAt: string | null; vetCount: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden print:shadow-none print:border-gray-200">
      {/* Header band */}
      <div className={`px-6 pt-6 pb-4 ${score >= 80 ? "bg-gradient-to-br from-emerald-50 to-teal-50" : score >= 60 ? "bg-gradient-to-br from-amber-50 to-yellow-50" : "bg-gradient-to-br from-red-50 to-orange-50"}`}>
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-primary" />
              KenyaVet Verified
            </p>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{name}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{role}</p>
          </div>
          <TrustRing score={score} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Recommendation score={score} />
          <span className="text-xs text-gray-400 bg-white/60 border border-gray-200 rounded-full px-2.5 py-0.5">{packageName}</span>
          {vetCount > 1 && (
            <span className="text-xs text-primary bg-primary/5 border border-primary/20 rounded-full px-2.5 py-0.5">{vetCount} vets on record</span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {badges.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Verified Checks</p>
            <div className="flex flex-wrap gap-2">
              {badges.map(badge => (
                <span key={badge} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  <CheckCircle className="w-3 h-3" /> {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        {flags.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-1.5">
              <AlertTriangle className="w-3 h-3" /> Flags Noted
            </p>
            <ul className="space-y-1">
              {flags.map(flag => (
                <li key={flag} className="text-xs text-amber-700">• {flag}</li>
              ))}
            </ul>
          </div>
        )}

        {summary && (
          <p className="text-sm text-gray-600 leading-relaxed border-l-2 border-primary/20 pl-3">{summary}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-50 pt-3">
          {verifiedAt && (
            <div>
              <p className="text-xs text-gray-400 font-medium">Verified</p>
              <p className="text-gray-700 font-medium">{formatDate(verifiedAt)}</p>
            </div>
          )}
          {reportId && (
            <div>
              <p className="text-xs text-gray-400 font-medium">Report ID</p>
              <p className="font-mono text-xs text-gray-700 font-medium">KV-RPT-{String(reportId).padStart(5, "0")}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-3 h-3 text-primary" />
            Verified by KenyaVet · kenyavet.co.ke
          </div>
          <div className="print:hidden flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            {score >= 60 && (() => {
              const verifyUrl = typeof window !== "undefined" ? window.location.href : "";
              const label = score >= 80 ? "Highly Trusted" : score >= 60 ? "Trusted" : "Caution";
              const rec = score >= 80 ? "✅ Safe to Hire" : "⚠️ Hire with Caution";
              const text = `*KenyaVet Background Check*\n\n*${name}* — ${role}\nTrust Score: *${score}/100* (${label})\nVerdict: ${rec}\n\nVerify here: ${verifyUrl}\n\n_Verified by KenyaVet · Kenya's trusted domestic staff vetting platform_`;
              return (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: "#25D366" }}
                >
                  <Share2 className="w-3.5 h-3.5" /> WhatsApp
                </a>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Verify() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const reportIdParam = params.get("reportId");
  const qrParam = params.get("qr") || "";

  const [qrInput, setQrInput] = useState(qrParam);
  const [report, setReport] = useState<PublicReport | null>(null);
  const [legacyWorker, setLegacyWorker] = useState<LegacyWorker | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function lookupByReportId(id: number) {
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await apiFetch<PublicReport>(`/reports/verify/${id}`);
      setReport(data);
      setLegacyWorker(null);
    } catch {
      setReport(null);
      setError("No verified report found. The QR code may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  }

  async function lookupByQr(qr: string) {
    if (!qr.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await apiFetch<LegacyWorker>(`/workers/verify/${encodeURIComponent(qr.trim())}`);
      setLegacyWorker(data);
      setReport(null);
    } catch {
      setLegacyWorker(null);
      setError("No verified worker found with that QR code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (reportIdParam) {
      const id = parseInt(reportIdParam, 10);
      if (!isNaN(id)) lookupByReportId(id);
    } else if (qrParam) {
      lookupByQr(qrParam);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = qrInput.trim();
    if (!val) return;
    const asNum = parseInt(val, 10);
    if (!isNaN(asNum)) {
      lookupByReportId(asNum);
    } else {
      lookupByQr(val);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white px-4 py-12">
      <style>{`@media print { body { background: white; } .print\\:hidden { display: none !important; } }`}</style>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-10 print:hidden">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-lg">KenyaVet</span>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Verify a Worker</h1>
          <p className="text-gray-500 text-sm mt-1">
            Scan a QR card or enter the report ID to confirm a worker's verified background check
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-6 print:hidden">
          <div className="relative flex-1">
            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Enter report ID or QR code…"
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <span className="animate-spin">⟳</span> : <Search className="w-4 h-4" />}
          </Button>
        </form>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100 text-center mb-4 print:hidden">
            {error}
          </div>
        )}

        {report && (
          <VerifyCard
            name={report.workerName}
            role={report.workerRole}
            score={report.trustScore}
            packageName={report.packageName}
            badges={report.badges}
            flags={report.flags}
            summary={report.summary}
            reportId={report.reportId}
            verifiedAt={report.verifiedAt}
            vetCount={report.vetCount}
          />
        )}

        {legacyWorker && (
          <VerifyCard
            name={legacyWorker.name}
            role={legacyWorker.role}
            score={legacyWorker.trustScore}
            packageName="KenyaVet Verified"
            badges={legacyWorker.badges ?? []}
            flags={[]}
            summary=""
            verifiedAt={legacyWorker.verifiedAt}
            vetCount={legacyWorker.vetCount}
          />
        )}

        {!searched && !report && !legacyWorker && (
          <div className="text-center mt-8 print:hidden">
            <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-sm text-muted-foreground">Scan a KenyaVet QR card or enter the report ID</p>
            <p className="text-xs text-muted-foreground mt-2">
              Workers carry a QR verification card issued after Premium vetting
            </p>
            <div className="mt-6 text-xs text-muted-foreground">
              Try report ID:{" "}
              <button onClick={() => { setQrInput("1"); lookupByReportId(1); }} className="text-primary underline">1</button>
            </div>
          </div>
        )}

        {!report && !legacyWorker && (
          <div className="mt-10 pt-8 border-t border-gray-100 text-center print:hidden">
            <p className="text-xs text-gray-400 mb-2">Are you a homeowner?</p>
            <Link href="/register">
              <Button size="sm" variant="outline" className="text-xs">
                Start background checking your staff →
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
