import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { getTrustScoreBg, getTrustScoreLabel, formatDate } from "@/lib/utils";
import {
  ArrowLeft, CheckCircle, Shield, Star, GitCompareArrows,
  MapPin, Clock, Languages, Trophy, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";

interface CompareWorker {
  id: number;
  name: string;
  role: string;
  trustScore: number | null;
  neighbourhood: string | null;
  yearsExperience: number | null;
  languages: string[];
  badges: string[];
  qrCode: string | null;
  vetCount: number;
  verifiedAt: string | null;
  avgRating: number | null;
  reviewCount: number;
  scoreBreakdown: Record<string, number | null> | null;
}

const SCORE_MAX: Record<string, number> = {
  identity: 30,
  dciCertificate: 20,
  references: 30,
  socialMedia: 15,
  addressVisit: 5,
};

const SCORE_LABELS: Record<string, string> = {
  identity: "Identity",
  dciCertificate: "DCI Check",
  references: "References",
  socialMedia: "Social Media",
  addressVisit: "Address Visit",
};

const COLORS = ["#10b981", "#6366f1", "#f59e0b"];

function TrustRing({ score, color }: { score: number; color: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

function WinnerBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 font-semibold">
      <Trophy className="w-2.5 h-2.5" /> BEST
    </span>
  );
}

function buildRadarData(workers: CompareWorker[]) {
  return Object.keys(SCORE_MAX)
    .filter(key => workers.some(w => w.scoreBreakdown && w.scoreBreakdown[key] != null))
    .map(key => {
      const row: Record<string, string | number> = { attr: SCORE_LABELS[key] };
      workers.forEach((w, i) => {
        const raw = w.scoreBreakdown?.[key] ?? 0;
        row[`w${i}`] = Math.round((raw / SCORE_MAX[key]) * 100);
      });
      return row;
    });
}

export default function WorkerCompare() {
  const [location] = useLocation();
  const [workers, setWorkers] = useState<CompareWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const ids = (() => {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("ids") || "";
    } catch {
      const match = location.match(/\?ids=([^&]+)/);
      return match ? match[1] : "";
    }
  })();

  useEffect(() => {
    if (!ids) { setError("No workers selected for comparison."); setLoading(false); return; }
    apiFetch<{ workers: CompareWorker[] }>(`/workers/compare?ids=${encodeURIComponent(ids)}`)
      .then(d => setWorkers(d.workers))
      .catch(() => setError("Failed to load comparison data."))
      .finally(() => setLoading(false));
  }, [ids]);

  const hasRadar = workers.some(w => w.scoreBreakdown && Object.values(w.scoreBreakdown).some(v => v != null));
  const radarData = hasRadar ? buildRadarData(workers) : [];

  function bestIdx<T>(key: keyof CompareWorker, higher = true): number {
    if (workers.length < 2) return -1;
    const vals = workers.map(w => w[key] as number | null);
    if (vals.every(v => v == null)) return -1;
    let best = -1, bestVal = higher ? -Infinity : Infinity;
    vals.forEach((v, i) => {
      if (v == null) return;
      if (higher ? v > bestVal : v < bestVal) { bestVal = v; best = i; }
    });
    return best;
  }

  function bestIdxBadges(): number {
    if (workers.length < 2) return -1;
    const lens = workers.map(w => w.badges?.length ?? 0);
    const max = Math.max(...lens);
    const idx = lens.indexOf(max);
    return lens.filter(l => l === max).length === 1 ? idx : -1;
  }

  const rows: { label: string; render: (w: CompareWorker, i: number) => React.ReactNode; winner: number }[] = [
    {
      label: "Trust Score",
      winner: bestIdx("trustScore"),
      render: (w, i) => w.trustScore != null ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getTrustScoreBg(w.trustScore)}`}>{w.trustScore}/100</span>
            <span className="text-xs text-muted-foreground">{getTrustScoreLabel(w.trustScore)}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden w-full max-w-[120px]">
            <div
              className={`h-full rounded-full ${w.trustScore >= 80 ? "bg-emerald-500" : w.trustScore >= 60 ? "bg-amber-500" : "bg-red-400"}`}
              style={{ width: `${w.trustScore}%` }}
            />
          </div>
        </div>
      ) : <span className="text-sm text-muted-foreground">No score</span>,
    },
    {
      label: "Community Rating",
      winner: bestIdx("avgRating"),
      render: (w) => w.avgRating != null ? (
        <div className="space-y-0.5">
          <StarRating rating={w.avgRating} />
          <p className="text-xs text-muted-foreground">{w.avgRating}/5 · {w.reviewCount} review{w.reviewCount !== 1 ? "s" : ""}</p>
        </div>
      ) : <span className="text-xs text-muted-foreground">No reviews yet</span>,
    },
    {
      label: "Vetting Count",
      winner: bestIdx("vetCount"),
      render: (w) => (
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{w.vetCount} time{w.vetCount !== 1 ? "s" : ""}</span>
        </div>
      ),
    },
    {
      label: "Experience",
      winner: bestIdx("yearsExperience"),
      render: (w) => w.yearsExperience ? (
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{w.yearsExperience} yrs</span>
        </div>
      ) : <span className="text-xs text-muted-foreground">Not specified</span>,
    },
    {
      label: "Neighbourhood",
      winner: -1,
      render: (w) => w.neighbourhood ? (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{w.neighbourhood}</span>
        </div>
      ) : <span className="text-xs text-muted-foreground">Not specified</span>,
    },
    {
      label: "Languages",
      winner: -1,
      render: (w) => w.languages?.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <Languages className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{w.languages.join(", ")}</span>
        </div>
      ) : <span className="text-xs text-muted-foreground">Not specified</span>,
    },
    {
      label: "Verified Badges",
      winner: bestIdxBadges(),
      render: (w) => w.badges?.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {w.badges.map(b => (
            <span key={b} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              <CheckCircle className="w-2.5 h-2.5" /> {b}
            </span>
          ))}
        </div>
      ) : <span className="text-xs text-muted-foreground">No badges</span>,
    },
    {
      label: "Verified On",
      winner: -1,
      render: (w) => w.verifiedAt ? (
        <span className="text-sm text-emerald-600">✓ {formatDate(w.verifiedAt)}</span>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
  ];

  const recommendation = (() => {
    if (workers.length < 2) return null;
    const best = bestIdx("trustScore");
    if (best === -1) return null;
    const w = workers[best];
    const score = w.trustScore;
    if (!score) return null;
    const verdict = score >= 80 ? "Safe to Hire" : score >= 60 ? "Hire with Caution" : "Do Not Hire";
    const color = score >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : score >= 60 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-red-50 border-red-200 text-red-800";
    return { name: w.name, verdict, color, score };
  })();

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <Link href="/workers">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Workers
          </button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <GitCompareArrows className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Worker Comparison</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? "Loading…" : `Comparing ${workers.length} KenyaVet-verified worker${workers.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {loading && (
          <div className="py-20 text-center text-muted-foreground text-sm">Loading comparison…</div>
        )}

        {!loading && error && (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-foreground font-medium">{error}</p>
            <Link href="/workers"><Button variant="outline" className="mt-4">Back to Workers</Button></Link>
          </div>
        )}

        {!loading && !error && workers.length > 0 && (
          <div className="space-y-6">
            {/* Worker header cards */}
            <div className={`grid gap-4 ${workers.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {workers.map((w, i) => (
                <div key={w.id} className="bg-card border border-card-border rounded-xl p-5 text-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${COLORS[i]}20` }}
                  >
                    <span className="text-xl font-bold" style={{ color: COLORS[i] }}>{w.name.charAt(0)}</span>
                  </div>
                  <h3 className="font-semibold text-foreground">{w.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{w.role}</p>
                  {w.trustScore != null
                    ? <TrustRing score={w.trustScore} color={COLORS[i]} />
                    : <div className="w-28 h-28 mx-auto flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">No score</span>
                      </div>
                  }
                  {w.trustScore != null && (
                    <p className={`text-xs font-semibold mt-2 px-2 py-1 rounded-full inline-block ${getTrustScoreBg(w.trustScore)}`}>
                      {w.trustScore >= 80 ? "Safe to Hire" : w.trustScore >= 60 ? "Hire with Caution" : "Do Not Hire"}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendation callout */}
            {recommendation && (
              <div className={`rounded-xl border px-5 py-4 flex items-center gap-3 ${recommendation.color}`}>
                <Trophy className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    Recommendation: <span>{recommendation.name}</span>
                  </p>
                  <p className="text-xs opacity-80 mt-0.5">
                    Highest trust score ({recommendation.score}/100) — {recommendation.verdict}
                  </p>
                </div>
              </div>
            )}

            {/* Attribute comparison table */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="font-semibold text-sm text-foreground">Attribute Comparison</h2>
              </div>
              <div className="divide-y divide-border">
                {rows.map(row => (
                  <div
                    key={row.label}
                    className={`grid gap-4 px-5 py-4 items-start ${workers.length === 3 ? "grid-cols-[140px_1fr_1fr_1fr]" : "grid-cols-[140px_1fr_1fr]"}`}
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-0.5">{row.label}</p>
                    {workers.map((w, i) => (
                      <div key={w.id} className="space-y-1">
                        {row.render(w, i)}
                        {row.winner === i && <WinnerBadge />}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Radar chart */}
            {radarData.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-5">
                <h2 className="font-semibold text-sm text-foreground mb-4">Score Breakdown Radar</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--color-border, #e5e7eb)" />
                    <PolarAngleAxis dataKey="attr" tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #6b7280)" }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(val: number, name: string) => {
                        const idx = parseInt(name.replace("w", ""), 10);
                        return [`${val}%`, workers[idx]?.name ?? name];
                      }}
                    />
                    {workers.map((w, i) => (
                      <Radar
                        key={w.id}
                        name={`w${i}`}
                        dataKey={`w${i}`}
                        stroke={COLORS[i]}
                        fill={COLORS[i]}
                        fillOpacity={0.12}
                        dot={{ fill: COLORS[i], r: 3 }}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-5 justify-center mt-2">
                  {workers.map((w, i) => (
                    <div key={w.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                      {w.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className={`grid gap-3 ${workers.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {workers.map((w, i) => (
                <div key={w.id} className="space-y-2">
                  <Link href={w.id > 0 ? `/workers/${w.id}` : `/verify?reportId=${-w.id}`}>
                    <Button
                      className="w-full gap-2"
                      style={i === bestIdx("trustScore") ? { backgroundColor: COLORS[i] } : {}}
                      variant={i === bestIdx("trustScore") ? "default" : "outline"}
                    >
                      <Shield className="w-4 h-4" />
                      View {w.name.split(" ")[0]}
                    </Button>
                  </Link>
                  <Link href={`/vetting-requests/new?workerName=${encodeURIComponent(w.name)}&workerRole=${encodeURIComponent(w.role)}`}>
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      Vet {w.name.split(" ")[0]} Again
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
