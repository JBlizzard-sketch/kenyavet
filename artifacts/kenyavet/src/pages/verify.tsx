import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Shield, CheckCircle, QrCode, Search, Star, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { getTrustScoreBg, getTrustScoreLabel, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface VerifiedWorker {
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
  const initialQr = params.get("qr") || "";

  const [qrInput, setQrInput] = useState(initialQr);
  const [worker, setWorker] = useState<VerifiedWorker | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function doLookup(qr: string) {
    if (!qr.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await apiFetch<VerifiedWorker>(`/workers/verify/${encodeURIComponent(qr.trim())}`);
      setWorker(data);
    } catch {
      setWorker(null);
      setError("No verified worker found with that QR code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQr) doLookup(initialQr);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doLookup(qrInput);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white px-4 py-12">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-lg">KenyaVet</span>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Verify a Worker</h1>
          <p className="text-gray-500 text-sm mt-1">Enter the QR code from a worker's KenyaVet card to verify their background check</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Enter QR code (e.g. KV-2025-00001)"
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "…" : <Search className="w-4 h-4" />}
          </Button>
        </form>

        {/* Result */}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100 text-center">
            {error}
          </div>
        )}

        {worker && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            {/* Trust banner */}
            <div className={`px-6 py-5 ${worker.trustScore >= 80 ? "bg-emerald-600" : worker.trustScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wide">KenyaVet Verified</p>
                  <h2 className="text-white text-2xl font-bold mt-0.5">{worker.name}</h2>
                  <p className="text-white/80 text-sm">{worker.role}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-white">{worker.trustScore}</div>
                  <div className="text-white/80 text-xs">Trust Score</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getTrustScoreBg(worker.trustScore)}`}>
                  {getTrustScoreLabel(worker.trustScore)}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  {worker.vetCount} vet{worker.vetCount !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="space-y-2 text-sm mb-5">
                {worker.neighbourhood && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Neighbourhood</span>
                    <span>{worker.neighbourhood}</span>
                  </div>
                )}
                {worker.yearsExperience && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience</span>
                    <span>{worker.yearsExperience} years</span>
                  </div>
                )}
                {worker.verifiedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verified</span>
                    <span>{formatDate(worker.verifiedAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">QR Code</span>
                  <span className="font-mono text-xs">{worker.qrCode}</span>
                </div>
              </div>

              {worker.badges && worker.badges.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Verified Credentials</p>
                  <div className="flex flex-wrap gap-2">
                    {worker.badges.map(badge => (
                      <span key={badge} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                        <CheckCircle className="w-3 h-3" /> {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {worker.languages && worker.languages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Languages: {worker.languages.join(", ")}
                </p>
              )}

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

        {!searched && !worker && (
          <div className="text-center mt-8">
            <QrCode className="w-16 h-16 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Scan a KenyaVet QR card or enter the code manually</p>
            <div className="mt-6 text-xs text-muted-foreground">
              <p>Try: <button onClick={() => { setQrInput("KV-2025-00001"); doLookup("KV-2025-00001"); }} className="text-primary underline">KV-2025-00001</button></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
