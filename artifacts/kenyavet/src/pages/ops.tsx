import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg } from "@/lib/utils";
import {
  CheckCircle, Clock, XCircle, AlertCircle, X, ChevronRight,
  User, MapPin, Phone, Package, Loader2, RefreshCw, Search,
  ClipboardCheck, Zap, FileText, Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const CALL_STATUSES = [
  { value: "pending", label: "Not Called" },
  { value: "completed", label: "Completed" },
  { value: "no_answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "wrong_number", label: "Wrong Number" },
];

function RefCallCard({ contact: refContact, token, onUpdated }: { contact: RefContact; token: string | null; onUpdated: () => void }) {
  const [callStatus, setCallStatus] = useState(refContact.callStatus);
  const [callSummary, setCallSummary] = useState(refContact.callSummary ?? "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(refContact.callStatus === "pending");

  const statusCfg: Record<string, { bg: string; text: string }> = {
    completed: { bg: "bg-emerald-100", text: "text-emerald-700" },
    no_answer: { bg: "bg-amber-100", text: "text-amber-700" },
    busy: { bg: "bg-amber-100", text: "text-amber-600" },
    wrong_number: { bg: "bg-red-100", text: "text-red-600" },
    pending: { bg: "bg-muted", text: "text-muted-foreground" },
  };
  const cfg = statusCfg[callStatus] ?? statusCfg.pending;

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/admin/references/${refContact.id}`, {
        method: "PATCH",
        token,
        body: { callStatus, callSummary },
      });
      onUpdated();
    } catch {} finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">{refContact.name}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
              {CALL_STATUSES.find(s => s.value === callStatus)?.label ?? callStatus}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{refContact.relationship} · {refContact.employerName}</p>
          {refContact.yearsWorked && <p className="text-xs text-muted-foreground">{refContact.yearsWorked}yr known</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`tel:${refContact.phone}`}
            className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Phone className="w-3 h-3" /> {refContact.phone}
          </a>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Call Status</label>
            <Select value={callStatus} onValueChange={setCallStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALL_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Call Summary / Notes</label>
            <textarea
              className="w-full text-xs p-2 rounded-lg border bg-white resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
              rows={2}
              placeholder="Summarise what the reference said…"
              value={callSummary}
              onChange={e => setCallSummary(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const FLAG_OPTIONS = [
  { value: "criminal_record", label: "Criminal Record" },
  { value: "negative_reference", label: "Negative Reference" },
  { value: "fake_id", label: "Fake ID" },
  { value: "inconsistent_history", label: "Inconsistent History" },
  { value: "social_media_concern", label: "Social Media Concern" },
];

function ReportBuilder({ detail, token, onCompleted }: {
  detail: OpsRequest; token: string | null; onCompleted: () => void;
}) {
  const isPremium = detail.packageSlug === "premium";
  const maxTotal = isPremium ? 100 : 90;

  const [identity, setIdentity] = useState(22);
  const [references, setReferences] = useState(25);
  const [dci, setDci] = useState(17);
  const [social, setSocial] = useState(12);
  const [address, setAddress] = useState(8);
  const trustScore = identity + references + dci + social + (isPremium ? address : 0);
  const recommendation = trustScore >= 80 ? "hire" : trustScore >= 60 ? "caution" : "do_not_hire";

  const recCfg = {
    hire: { label: "Safe to Hire", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    caution: { label: "Proceed with Caution", cls: "text-amber-700 bg-amber-50 border-amber-200" },
    do_not_hire: { label: "Do Not Hire", cls: "text-red-700 bg-red-50 border-red-200" },
  }[recommendation];

  const [summary, setSummary] = useState("");
  const [refsSummary, setRefsSummary] = useState("");
  const [socialSummary, setSocialSummary] = useState("");
  const [identityVerified, setIdentityVerified] = useState(true);
  const [dciStatus, setDciStatus] = useState("verified");
  const [flags, setFlags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValid = summary.trim().length > 10;

  async function submit() {
    if (!isValid) return;
    setSubmitting(true); setError("");
    try {
      await apiFetch(`/admin/requests/${detail.id}/report`, {
        method: "POST", token,
        body: {
          scoreBreakdown: {
            identity, references, dciCertificate: dci,
            socialMedia: social, addressVisit: isPremium ? address : null,
          },
          summary, identityVerified,
          dciCertificateStatus: dciStatus,
          referencesSummary: refsSummary || undefined,
          socialMediaSummary: socialSummary || undefined,
          flags,
        },
      });
      onCompleted();
    } catch { setError("Failed to publish report. Please try again."); }
    finally { setSubmitting(false); }
  }

  const scoreBarColor = trustScore >= 80 ? "bg-emerald-500" : trustScore >= 60 ? "bg-amber-500" : "bg-red-500";
  const scoreTxtColor = trustScore >= 80 ? "text-emerald-600" : trustScore >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-background p-4 space-y-5">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        Generate Vetting Report
      </h3>

      {/* Live trust score */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="text-center shrink-0">
          <div className={`text-4xl font-black ${scoreTxtColor}`}>{trustScore}</div>
          <div className="text-xs text-muted-foreground">/ {maxTotal}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${scoreBarColor}`}
              style={{ width: `${(trustScore / maxTotal) * 100}%` }}
            />
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border inline-block ${recCfg.cls}`}>
            {recCfg.label}
          </span>
        </div>
      </div>

      {/* Score breakdown sliders */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Score Breakdown</p>
        <div className="space-y-2.5">
          {[
            { label: "Identity Verification", value: identity, setter: setIdentity, max: 25 },
            { label: "Reference Calls", value: references, setter: setReferences, max: 30 },
            { label: "DCI Certificate", value: dci, setter: setDci, max: 20 },
            { label: "Social Media", value: social, setter: setSocial, max: 15 },
            ...(isPremium ? [{ label: "Address Visit", value: address, setter: setAddress, max: 10 }] : []),
          ].map(({ label, value, setter, max }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="text-xs text-muted-foreground w-32 shrink-0 leading-tight">{label}</span>
              <input
                type="range" min={0} max={max} value={value}
                onChange={e => setter(Number(e.target.value))}
                className="flex-1 accent-primary h-1.5"
              />
              <span className="text-xs font-mono w-9 text-right text-foreground shrink-0">{value}/{max}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Checks */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Identity Check</label>
          <Select value={identityVerified ? "verified" : "failed"} onValueChange={v => setIdentityVerified(v === "verified")}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="verified" className="text-xs">Verified</SelectItem>
              <SelectItem value="failed" className="text-xs">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">DCI Certificate</label>
          <Select value={dciStatus} onValueChange={setDciStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="verified" className="text-xs">Verified Clean</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="failed" className="text-xs">Has Record</SelectItem>
              <SelectItem value="not_applicable" className="text-xs">N/A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Verification Summary <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full text-xs p-3 rounded-lg border bg-white resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
          rows={3}
          placeholder="Write a professional summary of all vetting findings…"
          value={summary}
          onChange={e => setSummary(e.target.value)}
        />
      </div>

      {detail.references?.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">References Summary</label>
          <textarea
            className="w-full text-xs p-2 rounded-lg border bg-white resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
            rows={2}
            placeholder="Summary of reference call outcomes…"
            value={refsSummary}
            onChange={e => setRefsSummary(e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Social Media Summary</label>
        <textarea
          className="w-full text-xs p-2 rounded-lg border bg-white resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
          rows={2}
          placeholder="Summary of social media review…"
          value={socialSummary}
          onChange={e => setSocialSummary(e.target.value)}
        />
      </div>

      {/* Flags */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Flag className="w-3 h-3" /> Flags (if any)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FLAG_OPTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => setFlags(prev => prev.includes(f.value) ? prev.filter(x => x !== f.value) : [...prev, f.value])}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                flags.includes(f.value)
                  ? "bg-red-100 border-red-300 text-red-700"
                  : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {!isValid && summary.length > 0 && (
        <p className="text-xs text-amber-600">Summary must be at least 10 characters.</p>
      )}

      <Button
        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
        onClick={submit}
        disabled={submitting || !isValid}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {submitting ? "Publishing report…" : "Publish Report & Notify Employer"}
      </Button>
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
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Reference Contacts
                {detail.references?.length > 0 && (
                  <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {detail.references.filter(r => r.callStatus === "completed").length}/{detail.references.length} called
                  </span>
                )}
              </h3>
              {!detail.references?.length ? (
                <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground text-center">
                  No reference contacts provided by the employer
                </div>
              ) : (
                <div className="space-y-2">
                  {detail.references.map(ref => (
                    <RefCallCard
                      key={ref.id}
                      contact={ref}
                      token={token}
                      onUpdated={load}
                    />
                  ))}
                </div>
              )}
            </div>

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
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-xs"
                  onClick={async () => {
                    try {
                      await apiFetch(`/admin/requests/${detail.id}/notes`, {
                        method: "PATCH", token, body: { adminNotes },
                      });
                    } catch {}
                  }}
                >
                  Save Notes
                </Button>
              </div>
            </div>

            {/* Report builder */}
            {detail.status !== "completed" ? (
              <ReportBuilder
                detail={detail}
                token={token}
                onCompleted={() => { onUpdated(); onClose(); }}
              />
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Report Published</p>
                  <p className="text-xs text-emerald-600">Trust Score: {detail.trustScore}/100 · Employer has been notified</p>
                </div>
              </div>
            )}
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
