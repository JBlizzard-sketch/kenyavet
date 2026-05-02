import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Shield, CheckCircle, QrCode, Search, AlertTriangle, ExternalLink } from "lucide-react";
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

  const trustColor = (score: number) =>
    score >= 80 ? "bg-emerald-600" : score >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-10">
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

        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
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
            {loading ? "…" : <Search className="w-4 h-4" />}
          </Button>
        </form>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100 text-center">
            {error}
          </div>
        )}

        {report && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            <div className={`px-6 py-5 ${trustColor(report.trustScore)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wide">KenyaVet Verified</p>
                  <h2 className="text-white text-2xl font-bold mt-0.5">{report.workerName}</h2>
                  <p className="text-white/80 text-sm">{report.workerRole}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-white">{report.trustScore}</div>
                  <div className="text-white/80 text-xs">Trust Score</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getTrustScoreBg(report.trustScore)}`}>
                  {getTrustScoreLabel(report.trustScore)}
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {report.packageName}
                </span>
              </div>

              {report.badges.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Verified Checks</p>
                  <div className="flex flex-wrap gap-2">
                    {report.badges.map(badge => (
                      <span key={badge} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                        <CheckCircle className="w-3 h-3" /> {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {report.flags.length > 0 && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-1.5">
                    <AlertTriangle className="w-3 h-3" /> Flags Noted
                  </p>
                  <ul className="space-y-1">
                    {report.flags.map(flag => (
                      <li key={flag} className="text-xs text-amber-700">• {flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {report.summary && (
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{report.summary}</p>
              )}

              <div className="space-y-1.5 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verified</span>
                  <span>{formatDate(report.verifiedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report ID</span>
                  <span className="font-mono text-xs">KV-RPT-{String(report.reportId).padStart(5, "0")}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3 text-primary" />
                  Verified by KenyaVet
                </div>
                <Link href="/" className="text-xs text-primary hover:underline flex items-center gap-1">
                  kenyavet.co.ke <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {legacyWorker && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            <div className={`px-6 py-5 ${trustColor(legacyWorker.trustScore)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wide">KenyaVet Verified</p>
                  <h2 className="text-white text-2xl font-bold mt-0.5">{legacyWorker.name}</h2>
                  <p className="text-white/80 text-sm">{legacyWorker.role}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-white">{legacyWorker.trustScore}</div>
                  <div className="text-white/80 text-xs">Trust Score</div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getTrustScoreBg(legacyWorker.trustScore)}`}>
                  {getTrustScoreLabel(legacyWorker.trustScore)}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  {legacyWorker.vetCount} vet{legacyWorker.vetCount !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="space-y-1.5 text-sm mb-5">
                {legacyWorker.neighbourhood && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Neighbourhood</span>
                    <span>{legacyWorker.neighbourhood}</span>
                  </div>
                )}
                {legacyWorker.verifiedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verified</span>
                    <span>{formatDate(legacyWorker.verifiedAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">QR Code</span>
                  <span className="font-mono text-xs">{legacyWorker.qrCode}</span>
                </div>
              </div>
              {legacyWorker.badges && legacyWorker.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {legacyWorker.badges.map(badge => (
                    <span key={badge} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      <CheckCircle className="w-3 h-3" /> {badge}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3 text-primary" /> Verified by KenyaVet
                </div>
                <Link href="/" className="text-xs text-primary hover:underline flex items-center gap-1">
                  kenyavet.co.ke <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {!searched && !report && !legacyWorker && (
          <div className="text-center mt-8">
            <QrCode className="w-16 h-16 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Scan a KenyaVet QR card or enter the report ID</p>
            <div className="mt-6 text-xs text-muted-foreground">
              <p>Try report ID: <button onClick={() => { setQrInput("1"); lookupByReportId(1); }} className="text-primary underline">1</button></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
