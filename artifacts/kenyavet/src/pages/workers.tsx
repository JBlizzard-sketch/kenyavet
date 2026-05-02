import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getTrustScoreBg, getTrustScoreLabel } from "@/lib/utils";
import { Search, Shield, Star, QrCode } from "lucide-react";
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
}

const roleFilters = ["All", "Housekeeper", "Driver", "Nanny", "Cook", "Gardener", "Security Guard"];

export default function Workers() {
  const { token } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  useEffect(() => {
    apiFetch<{ workers: Worker[] }>("/workers", { token }).then(d => {
      setWorkers(d.workers);
    }).catch(() => setWorkers([])).finally(() => setLoading(false));
  }, [token]);

  const filtered = workers.filter(w => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.neighbourhood || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "All" || w.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-foreground">Verified Workers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Browse KenyaVet-verified domestic workers in Nairobi</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or neighbourhood…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
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
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">No workers found.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(worker => (
              <div key={worker.id} className="bg-card rounded-xl border border-card-border p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">{worker.name.charAt(0)}</span>
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
                        className={`h-full rounded-full ${worker.trustScore >= 80 ? "bg-emerald-500" : worker.trustScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${worker.trustScore}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  {worker.neighbourhood && <div>📍 {worker.neighbourhood}</div>}
                  {worker.yearsExperience && <div>⏱ {worker.yearsExperience} years experience</div>}
                  {worker.vetCount > 0 && <div><Shield className="w-3 h-3 inline mr-1 text-primary" />{worker.vetCount} vet{worker.vetCount !== 1 ? "s" : ""} completed</div>}
                </div>

                {worker.badges && worker.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {worker.badges.slice(0, 3).map(badge => (
                      <span key={badge} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{badge}</span>
                    ))}
                  </div>
                )}

                {worker.languages && worker.languages.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-4">
                    {worker.languages.join(" · ")}
                  </div>
                )}

                <div className="mt-auto flex gap-2">
                  {worker.qrCode && (
                    <Link href={`/verify?qr=${worker.qrCode}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <QrCode className="w-3 h-3" /> Verify
                      </Button>
                    </Link>
                  )}
                  <Link href="/vetting-requests/new">
                    <Button size="sm" variant="outline" className="flex-1">Vet Similar</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
