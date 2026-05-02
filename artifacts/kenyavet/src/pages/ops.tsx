import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg } from "@/lib/utils";
import {
  CheckCircle, Clock, XCircle, AlertCircle, X, ChevronRight,
  User, MapPin, Phone, Package, Loader2, RefreshCw, Search,
  ClipboardCheck, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Step {
  id: number;
  stepName: string;
  stepKey: string;
  status: string;
  order: number;
  notes: string | null;
  completedAt: string | null;
}

interface RefContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
  employerName: string;
  yearsWorked: number | null;
  callStatus: string;
  callSummary: string | null;
}

interface OpsRequest {
  id: number;
  workerName: string;
  workerRole: string;
  workerIdNumber: string;
  workerPhone: string | null;
  workerAddress: string | null;
  packageName: string;
  packageSlug: string;
  priceKsh: number;
  status: string;
  trustScore: number | null;
  reportId: number | null;
  adminNotes: string | null;
  employerName: string;
  employerEmail: string;
  employerPhone: string | null;
  employerNeighbourhood: string | null;
  createdAt: string;
  updatedAt: string;
  steps: Step[];
  references: RefContact[];
}

interface AdminRequest {
  id: number;
  workerName: string;
  workerRole: string;
  status: string;
  packageName: string;
  trustScore: number | null;
  adminNotes: string | null;
  employerName: string;
  employerNeighbourhood: string | null;
  createdAt: string;
}

const stepStatusIcon: Record<string, React.ElementType> = {
  completed: CheckCircle,
  in_progress: Clock,
  failed: XCircle,
  pending: AlertCircle,
};

const stepStatusColor: Record<string, string> = {
  completed: "text-emerald-600",
  in_progress: "text-blue-600",
  failed: "text-red-500",
  pending: "text-muted-foreground",
};

const stepStatusBg: Record<string, string> = {
  completed: "bg-emerald-50 border-emerald-200",
  in_progress: "bg-blue-50 border-blue-200",
  failed: "bg-red-50 border-red-200",
  pending: "bg-muted/50 border-border",
};

function StepRow({
  step, token, onUpdated,
}: {
  step: Step; token: string | null; onUpdated: () => void;
}) {
  const [notes, setNotes] = useState(step.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const Icon = stepStatusIcon[step.status] ?? AlertCircle;

  async function updateStep(status: string) {
    setSaving(true);
    try {
      await apiFetch(`/admin/steps/${step.id}`, {
        method: "PATCH",
        token,
        body: { status, notes: notes || undefined },
      });
      onUpdated();
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div className={`rounded-xl border p-4 ${stepStatusBg[step.status]}`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 shrink-0 ${stepStatusColor[step.status]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{step.stepName}</p>
          {step.completedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(step.completedAt)}</p>
          )}
          {step.notes && !expanded && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {step.status !== "completed" && (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => updateStep("completed")}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              <span className="ml-1 hidden sm:inline">Done</span>
            </Button>
          )}
          {step.status !== "failed" && step.status !== "pending" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => updateStep("failed")}
              disabled={saving}
            >
              <XCircle className="w-3 h-3" />
            </Button>
          )}
          {step.status === "failed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => updateStep("pending")}
              disabled={saving}
            >
              Retry
            </Button>
          )}
          {step.status === "completed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => updateStep("pending")}
              disabled={saving}
            >
              Undo
            </Button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <textarea
            className="w-full text-xs p-2 rounded-lg border bg-white resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
            rows={2}
            placeholder="Add notes for this step…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs"
              onClick={() => updateStep(step.status)}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Notes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OpsDrawer({
  requestId, token, onClose, onUpdated,
}: {
  requestId: number; token: string | null; onClose: () => void; onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<OpsRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<OpsRequest>(`/admin/requests/${requestId}/detail`, { token });
      setDetail(data);
      setAdminNotes(data.adminNotes ?? "");
    } catch {}
    finally { setLoading(false); }
  }, [requestId, token]);

  useEffect(() => { load(); }, [load]);

  const completedSteps = detail?.steps.filter(s => s.status === "completed").length ?? 0;
  const totalSteps = detail?.steps.length ?? 0;
  const allDone = totalSteps > 0 && completedSteps === totalSteps;

  async function completeRequest() {
    if (!detail) return;
    setCompleting(true);
    try {
      await apiFetch(`/admin/requests/${detail.id}/notes`, {
        method: "PATCH", token, body: { adminNotes },
      });
      await apiFetch(`/admin/requests/${detail.id}/status`, {
        method: "PATCH", token, body: { status: "completed" },
      });
      onUpdated();
      onClose();
    } catch {}
    finally { setCompleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-background h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">{detail?.workerName ?? "Loading…"}</h2>
            <p className="text-xs text-muted-foreground">
              {detail?.workerRole} · {detail?.packageName} · Request #{requestId}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-foreground">{completedSteps}/{totalSteps} steps complete</span>
                <span className={allDone ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                  {allDone ? "Ready to complete" : `${totalSteps - completedSteps} remaining`}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: totalSteps > 0 ? `${(completedSteps / totalSteps) * 100}%` : "0%" }}
                />
              </div>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Worker
                </p>
                <p className="text-sm font-medium">{detail.workerName}</p>
                <p className="text-xs text-muted-foreground">{detail.workerRole}</p>
                {detail.workerPhone && <p className="text-xs text-muted-foreground">{detail.workerPhone}</p>}
                <p className="text-xs font-mono text-muted-foreground mt-1">ID: {detail.workerIdNumber}</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Employer
                </p>
                <p className="text-sm font-medium">{detail.employerName}</p>
                {detail.employerNeighbourhood && (
                  <p className="text-xs text-muted-foreground">{detail.employerNeighbourhood}</p>
                )}
                {detail.employerPhone && <p className="text-xs text-muted-foreground">{detail.employerPhone}</p>}
                <p className="text-xs text-muted-foreground truncate">{detail.employerEmail}</p>
              </div>
            </div>

            {/* Reference contacts */}
            {detail.references && detail.references.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> Reference Contacts ({detail.references.length})
                </h3>
                <div className="space-y-2">
                  {detail.references.map((ref, i) => (
                    <div key={ref.id} className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{ref.name}</p>
                          <p className="text-xs text-muted-foreground">{ref.relationship} · {ref.employerName}</p>
                          {ref.yearsWorked && <p className="text-xs text-muted-foreground">{ref.yearsWorked} yr{ref.yearsWorked !== 1 ? "s" : ""} known</p>}
                          {ref.callSummary && (
                            <p className="text-xs text-foreground mt-1 bg-emerald-50 rounded px-2 py-1">{ref.callSummary}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            ref.callStatus === "completed" ? "bg-emerald-100 text-emerald-700" :
                            ref.callStatus === "no_answer" ? "bg-amber-100 text-amber-700" :
                            "bg-muted text-muted-foreground"
                          }`}>{ref.callStatus === "pending" ? "Not called" : ref.callStatus.replace("_", " ")}</span>
                          <a
                            href={`tel:${ref.phone}`}
                            className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <Phone className="w-3 h-3" /> {ref.phone}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.references?.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground text-center">
                No reference contacts provided by the employer
              </div>
            )}

            {/* Steps */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Verification Steps
              </h3>
              <div className="space-y-2">
                {detail.steps.map(step => (
                  <StepRow
                    key={step.id}
                    step={step}
                    token={token}
                    onUpdated={load}
                  />
                ))}
              </div>
            </div>

            {/* Ops notes */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Ops Notes (internal)
              </h3>
              <textarea
                className="w-full text-sm p-3 rounded-xl border bg-muted/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={3}
                placeholder="Notes visible to ops team only…"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />
            </div>

            {/* Complete button */}
            <div className={`rounded-xl p-4 border ${allDone ? "bg-emerald-50 border-emerald-200" : "bg-muted/40 border-border"}`}>
              <p className="text-xs text-muted-foreground mb-3">
                {allDone
                  ? "All steps are complete. Clicking below will generate the trust score report and notify the employer."
                  : `Complete all ${totalSteps - completedSteps} remaining step(s) first, or click below to override and complete anyway.`
                }
              </p>
              <Button
                className={`w-full gap-2 ${allDone ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                variant={allDone ? "default" : "outline"}
                onClick={completeRequest}
                disabled={completing}
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {completing ? "Generating report…" : "Complete & Generate Report"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Request not found
          </div>
        )}
      </div>
    </div>
  );
}

export default function Ops() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("in_progress");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ requests: AdminRequest[] }>(
        `/admin/requests?status=${statusFilter}`,
        { token }
      );
      setRequests(data.requests);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = requests.filter(r =>
    r.workerName.toLowerCase().includes(search.toLowerCase()) ||
    r.employerName.toLowerCase().includes(search.toLowerCase())
  );

  const statusTabs = [
    { key: "in_progress", label: "In Progress" },
    { key: "all", label: "All Requests" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <AppLayout>
      {selected && (
        <OpsDrawer
          requestId={selected}
          token={token}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); setSelected(null); }}
        />
      )}

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-primary" />
              Ops Workflow
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Process vetting requests step by step</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by worker or employer name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Requests list */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading requests…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No {statusFilter === "in_progress" ? "in-progress" : ""} requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => (
              <div
                key={req.id}
                className="bg-card rounded-xl border border-card-border p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => setSelected(req.id)}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary text-sm font-bold">{req.workerName.charAt(0)}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground text-sm">{req.workerName}</p>
                    <span className="text-xs text-muted-foreground">{req.workerRole}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {req.employerName}
                    </span>
                    {req.employerNeighbourhood && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {req.employerNeighbourhood}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" /> {req.packageName}
                    </span>
                    <span>{formatDate(req.createdAt)}</span>
                  </div>
                  {req.adminNotes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Note: {req.adminNotes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {req.trustScore != null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getTrustScoreBg(req.trustScore)}`}>
                      {req.trustScore}/100
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(req.status)}`}>
                    {getStatusLabel(req.status)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
