import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getTrustScoreBg, getTrustScoreLabel, formatDate } from "@/lib/utils";
import { Search, Shield, CheckCircle, QrCode, FileText, Users, GitCompareArrows, X, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Worker {
  id: number;
  name: string;
  role: string;
  trustScore: number | null;
  neighbourhood: string | null;
  yearsExperience: number | null;
  languages: string[] | null;
  badges: string[] | null;
  qrCode: string | null;
  vetCount: number;
  verifiedAt: string | null;
  fromReport?: boolean;
  reportId?: number | null;
}

const roleFilters = ["All", "Housekeeper", "Driver", "Nanny", "Cook", "Gardener", "Security Guard"];
const minScoreOptions = [
  { label: "Any score", value: "" },
  { label: "80+ (Highly Trusted)", value: "80" },
  { label: "70+ (Trusted)", value: "70" },
  { label: "60+ (Acceptable)", value: "60" },
];

function ComparePanel({ workers, ids, onClose }: { workers: Worker[]; ids: number[]; onClose: () => void }) {
  const selected = ids.map(id => workers.find(w => w.id === id)).filter(Boolean) as Worker[];
  if (selected.length === 0) return null;

  function ScoreBar({ score }: { score: number | null }) {
    if (score == null) return <span className="text-xs text-muted-foreground">No score</span>;
    const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-400";
    return (
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getTrustScoreBg(score)}`}>{score}/100</span>
          <span className="text-xs text-muted-foreground">{getTrustScoreLabel(score)}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border shadow-2xl">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            Worker Comparison
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {selected.length === 1 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Select one more worker to compare side-by-side.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {selected.map(w => (
              <div key={w.id} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">{w.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.role}</p>
                  </div>
                </div>
                <ScoreBar score={w.trustScore} />
                <div className="space-y-1 text-xs text-muted-foreground">
                  {w.neighbourhood && <div>📍 {w.neighbourhood}</div>}
                  {w.yearsExperience && <div>⏱ {w.yearsExperience} yrs experience</div>}
                  {w.verifiedAt && <div className="text-emerald-600">✓ Verified {formatDate(w.verifiedAt)}</div>}
                </div>
                {w.badges && w.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {w.badges.slice(0, 4).map(b => (
                      <span key={b} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" /> {b}
                      </span>
                    ))}
                  </div>
                )}
                {w.languages && w.languages.length > 0 && (
                  <div className="text-xs text-muted-foreground">{w.languages.join(" · ")}</div>
                )}
                <Link href={`/workers/${w.id}`}>
                  <Button size="sm" className="w-full gap-1.5 h-8 text-xs mt-1">
                    View Profile <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Workers() {
  const { token } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [minScore, setMinScore] = useState("");
  const [compareList, setCompareList] = useState<number[]>([]);

  function toggleCompare(id: number) {
    setCompareList(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("query", search);
    if (roleFilter !== "All") params.set("role", roleFilter);
    if (minScore) params.set("minScore", minScore);

    apiFetch<{ workers: Worker[] }>(`/workers?${params}`, { token }).then(d => {
      setWorkers(d.workers);
    }).catch(() => setWorkers([])).finally(() => setLoading(false));
  }, [token, search, roleFilter, minScore]);

  const scoreColor = (score: number | null) => {
    if (!score) return "bg-muted rounded-full";
    if (score >= 80) return "bg-emerald-500 rounded-full";
    if (score >= 60) return "bg-amber-500 rounded-full";
    return "bg-red-500 rounded-full";
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Verified Workers</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {loading ? "Loading…" : `${workers.length} KenyaVet-verified workers`}
            </p>
          </div>
          <Link href="/vetting-requests/new">
            <Button className="gap-2">
              <Shield className="w-4 h-4" />
              Vet a Worker
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or neighbourhood…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <select
            value={minScore}
            onChange={e => setMinScore(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {minScoreOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Role filter pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {roleFilters.map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === role
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading workers…</div>
        ) : workers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-4">No verified workers found.</p>
            <Link href="/vetting-requests/new">
              <Button size="sm">Vet your first worker</Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map(worker => (
              <div key={worker.id} className={`bg-card rounded-xl border border-card-border p-5 flex flex-col hover:shadow-sm transition-shadow ${worker.id > 0 ? "cursor-pointer" : ""}`}
                onClick={() => { if (worker.id > 0) window.location.href = `/workers/${worker.id}`; }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 relative">
                      <span className="text-primary font-bold">{worker.name.charAt(0)}</span>
                      {worker.fromReport && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Shield className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">{worker.role}</p>
                    </div>
                  </div>
                  {worker.trustScore != null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getTrustScoreBg(worker.trustScore)}`}>
                      {worker.trustScore}
                    </span>
                  )}
                </div>

                {worker.trustScore != null && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Trust Score</span>
                      <span className="font-medium">{getTrustScoreLabel(worker.trustScore)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${scoreColor(worker.trustScore)}`}
                        style={{ width: `${worker.trustScore}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  {worker.neighbourhood && <div>📍 {worker.neighbourhood}</div>}
                  {worker.yearsExperience && <div>⏱ {worker.yearsExperience} years experience</div>}
                  {worker.verifiedAt && (
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-primary" />
                      Verified {formatDate(worker.verifiedAt)}
                    </div>
                  )}
                </div>

                {worker.badges && worker.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {worker.badges.slice(0, 3).map(badge => (
                      <span key={badge} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        <CheckCircle className="w-2.5 h-2.5" /> {badge}
                      </span>
                    ))}
                  </div>
                )}

                {worker.languages && worker.languages.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-4">
                    {worker.languages.join(" · ")}
                  </div>
                )}

                <div className="mt-auto flex gap-2 flex-wrap">
                  {worker.qrCode && (
                    <Link href={`/verify?qr=${worker.qrCode}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                        <QrCode className="w-3 h-3" /> Verify
                      </Button>
                    </Link>
                  )}
                  {worker.fromReport && worker.reportId && (
                    <Link href={`/verify?reportId=${worker.reportId}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                        <Shield className="w-3 h-3" /> Verify
                      </Button>
                    </Link>
                  )}
                  {worker.id > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); toggleCompare(worker.id); }}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                        compareList.includes(worker.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      <GitCompareArrows className="w-3 h-3" />
                      {compareList.includes(worker.id) ? "Added" : "Compare"}
                    </button>
                  )}
                  <Link href="/vetting-requests/new" className="flex-1">
                    <Button size="sm" variant="ghost" className="w-full h-8 text-xs">
                      Vet Similar
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {compareList.length > 0 && (
        <ComparePanel
          workers={workers}
          ids={compareList}
          onClose={() => setCompareList([])}
        />
      )}
    </AppLayout>
  );
}
