import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getTrustScoreBg, getTrustScoreLabel, formatDate } from "@/lib/utils";
import { Search, Shield, CheckCircle, QrCode, Users, GitCompareArrows, X, ArrowRight, Star } from "lucide-react";
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
  avgRating?: number | null;
  reviewCount?: number;
}

const roleFilters = ["All", "Housekeeper", "Driver", "Nanny", "Cook", "Gardener", "Security Guard"];
const minScoreOptions = [
  { label: "Any score", value: "" },
  { label: "80+ (Highly Trusted)", value: "80" },
  { label: "70+ (Trusted)", value: "70" },
  { label: "60+ (Acceptable)", value: "60" },
];

function ComparePanel({ workers, ids, onClose }: { workers: Worker[]; ids: number[]; onClose: () => void }) {
  const [, navigate] = useLocation();
  const selected = ids.map(id => workers.find(w => w.id === id)).filter(Boolean) as Worker[];
  if (selected.length === 0) return null;

  function goFullCompare() {
    navigate(`/workers/compare?ids=${ids.join(",")}`);
    onClose();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border shadow-2xl">
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            Comparing {selected.length} worker{selected.length !== 1 ? "s" : ""}
            {selected.length < 3 && (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                · select {3 - selected.length} more to add
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {selected.length >= 2 && (
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={goFullCompare}>
                <GitCompareArrows className="w-3 h-3" />
                Full Comparison
              </Button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={`grid gap-3 ${selected.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {selected.map(w => (
            <div key={w.id} className="flex items-center gap-2.5 bg-muted/40 rounded-lg px-3 py-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">{w.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{w.name}</p>
                <p className="text-xs text-muted-foreground">{w.role}</p>
              </div>
              {w.trustScore != null && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${getTrustScoreBg(w.trustScore)}`}>
                  {w.trustScore}
                </span>
              )}
            </div>
          ))}
        </div>
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
      if (prev.length >= 3) return [prev[1], prev[2], id];
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
                  <div className="text-xs text-muted-foreground mb-2">
                    {worker.languages.join(" · ")}
                  </div>
                )}

                {worker.avgRating != null && (
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`w-3 h-3 ${n <= Math.round(worker.avgRating!) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-0.5">{worker.avgRating} ({worker.reviewCount})</span>
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
