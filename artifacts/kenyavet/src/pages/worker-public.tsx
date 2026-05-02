import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Shield, CheckCircle, MapPin, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTrustScoreBg, getTrustScoreLabel, formatDate } from "@/lib/utils";

interface PublicWorker {
  id: number;
  name: string;
  role: string;
  trustScore: number | null;
  photoUrl: string | null;
  neighbourhood: string | null;
  yearsExperience: number | null;
  languages: string[];
  badges: string[];
  qrCode: string;
  vetCount: number;
  verifiedAt: string | null;
}

function TrustRing({ score }: { score: number }) {
  const radius = 64;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const dash = pct * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 148 148">
        <circle cx="74" cy="74" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="74" cy="74" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 1.2s ease" }}
        />
      </svg>
      <div className="relative text-center">
        <div className="text-5xl font-black text-gray-900 leading-none">{score}</div>
        <div className="text-xs text-gray-400 mt-1 font-medium tracking-wide uppercase">Trust Score</div>
      </div>
    </div>
  );
}

function RecommendationBadge({ score }: { score: number }) {
  if (score >= 80) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-sm">
        <CheckCircle className="w-4 h-4" /> Safe to Hire
      </span>
    );
  }
  if (score >= 60) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm">
        <AlertTriangle className="w-4 h-4" /> Hire with Caution
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-100 text-red-800 font-semibold text-sm">
      <AlertTriangle className="w-4 h-4" /> Do Not Hire
    </span>
  );
}

export default function WorkerPublic() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [worker, setWorker] = useState<PublicWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!qrCode) { setLoading(false); setNotFound(true); return; }
    apiFetch<PublicWorker>(`/workers/verify/${encodeURIComponent(qrCode)}`)
      .then(setWorker)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [qrCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      {/* Header */}
      <header className="py-4 px-6 flex items-center justify-between max-w-2xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <Shield className="w-5 h-5" />
          <span className="font-bold font-serif text-base">KenyaVet</span>
        </Link>
        <span className="text-xs text-muted-foreground bg-white border border-border px-2.5 py-1 rounded-full">
          Verified Worker Profile
        </span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {loading && (
            <div className="bg-card rounded-2xl border border-card-border shadow-sm p-12 text-center">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Loading worker profile…</p>
            </div>
          )}

          {!loading && notFound && (
            <div className="bg-card rounded-2xl border border-card-border shadow-sm p-12 text-center">
              <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <h2 className="font-semibold text-foreground mb-2">Worker not found</h2>
              <p className="text-sm text-muted-foreground mb-6">
                No verified worker was found with QR code <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{qrCode}</code>.
              </p>
              <Link href="/verify" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                Try verifying manually <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {!loading && worker && (
            <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
              {/* Top gradient band */}
              <div className="h-3 bg-gradient-to-r from-primary via-emerald-400 to-teal-500" />

              <div className="p-8 text-center">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-4xl font-black text-primary">
                  {worker.name.charAt(0)}
                </div>

                <h1 className="text-2xl font-serif font-bold text-foreground">{worker.name}</h1>
                <p className="text-muted-foreground mt-0.5 mb-6">{worker.role}</p>

                {/* Trust ring */}
                {worker.trustScore != null && (
                  <div className="flex flex-col items-center gap-3 mb-6">
                    <TrustRing score={worker.trustScore} />
                    <RecommendationBadge score={worker.trustScore} />
                    <span className={`text-sm font-medium ${getTrustScoreBg(worker.trustScore)} px-2.5 py-0.5 rounded-full`}>
                      {getTrustScoreLabel(worker.trustScore)}
                    </span>
                  </div>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground mb-6">
                  {worker.neighbourhood && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {worker.neighbourhood}
                    </span>
                  )}
                  {worker.verifiedAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Verified {formatDate(worker.verifiedAt)}
                    </span>
                  )}
                  {worker.vetCount > 1 && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                      {worker.vetCount}× vetted
                    </span>
                  )}
                </div>

                {/* Verified badges */}
                {worker.badges && worker.badges.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {worker.badges.map(b => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 font-medium"
                      >
                        <CheckCircle className="w-3 h-3" /> {b}
                      </span>
                    ))}
                  </div>
                )}

                {/* Languages */}
                {worker.languages && worker.languages.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-6">
                    Speaks: {worker.languages.join(", ")}
                  </p>
                )}

                {/* QR code label */}
                <div className="bg-muted/50 rounded-lg px-4 py-2.5 inline-block mb-4">
                  <p className="text-xs text-muted-foreground">Certificate ID</p>
                  <p className="font-mono font-bold text-foreground text-sm">{worker.qrCode}</p>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="border-t border-border bg-muted/30 px-8 py-5 text-center">
                <p className="text-xs text-muted-foreground mb-3">
                  This verification was conducted by KenyaVet — Kenya's trusted domestic staff vetting service.
                </p>
                <Link href="/register" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                  Vet your own staff with KenyaVet <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            Powered by <span className="text-primary font-medium">KenyaVet</span> · Background verification for Nairobi homes
          </p>
        </div>
      </main>
    </div>
  );
}
