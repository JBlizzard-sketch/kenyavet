import { useEffect, useState, useCallback, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch, API_BASE } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg } from "@/lib/utils";
import {
  CheckCircle, Clock, XCircle, AlertCircle, X, ChevronRight,
  User, MapPin, Phone, Package, Loader2, RefreshCw, Search,
  ClipboardCheck, Zap, FileText, Flag, BarChart2, TrendingUp, Target, Award,
  Paperclip, Upload, Download, File, Trash2, LayoutGrid, Play,
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

interface DocRecord {
  id: number;
  requestId: number;
  uploadedBy: number;
  uploaderRole: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  objectPath: string;
  label: string | null;
  createdAt: string;
}

interface AdminRequest {
  id: number;
  workerName: string;
  workerRole: string;
  status: string;
  packageName: string;
  packageSlug: string;
  turnaroundHours: number;
  trustScore: number | null;
  adminNotes: string | null;
  employerName: string;
  employerNeighbourhood: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OpsAnalytics {
  queue: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    completedToday: number;
    completedThisWeek: number;
  };
  avgCompletionHours: number | null;
  slaAdherence: number | null;
  packageBreakdown: Array<{
    slug: string;
    name: string;
    total: number;
    completed: number;
    slaAdherence: number | null;
    avgHours: number | null;
  }>;
  stepBreakdown: Array<{
    name: string;
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    failed: number;
    completionRate: number;
  }>;
}

function getSlaInfo(req: AdminRequest): { label: string; urgent: boolean; overdue: boolean } {
  if (req.status !== "in_progress") return { label: "", urgent: false, overdue: false };
  const paidAt = new Date(req.updatedAt).getTime();
  const dueAt = paidAt + req.turnaroundHours * 60 * 60 * 1000;
  const now = Date.now();
  const diffMs = dueAt - now;
  const diffH = Math.round(diffMs / (60 * 60 * 1000));
  if (diffMs < 0) return { label: `Overdue by ${Math.abs(diffH)}h`, urgent: true, overdue: true };
  if (diffH <= 6) return { label: `Due in ${diffH}h`, urgent: true, overdue: false };
  return { label: `Due in ${diffH}h`, urgent: false, overdue: false };
}

const KANBAN_COLUMNS = [
  { key: "pending_payment", label: "Awaiting Payment", dot: "bg-amber-400", border: "border-amber-200", head: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "in_progress",     label: "In Progress",      dot: "bg-blue-500",  border: "border-blue-200",  head: "bg-blue-50 dark:bg-blue-900/20"  },
  { key: "completed",       label: "Completed",        dot: "bg-emerald-500", border: "border-emerald-200", head: "bg-emerald-50 dark:bg-emerald-900/20" },
  { key: "cancelled",       label: "Cancelled",        dot: "bg-slate-400", border: "border-slate-200", head: "bg-slate-50 dark:bg-slate-900/20" },
];

function KanbanCard({
  req, onSelect, onStartVetting,
}: { req: AdminRequest; onSelect: (id: number) => void; onStartVetting: (id: number) => void }) {
  const sla = getSlaInfo(req);
  return (
    <div
      onClick={() => onSelect(req.id)}
      className="bg-card rounded-xl border border-card-border p-3 cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between gap-1 mb-0.5">
        <p className="font-semibold text-sm text-foreground leading-tight">{req.workerName}</p>
        <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded-full capitalize">{req.packageSlug}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{req.workerRole}</p>

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
        <User className="w-3 h-3 shrink-0" />
        <span className="truncate">{req.employerName}</span>
      </div>
      {req.employerNeighbourhood && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{req.employerNeighbourhood}</span>
        </div>
      )}

      {sla.label && (
        <span className={`mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
          sla.overdue ? "bg-red-100 text-red-700" : sla.urgent ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"
        }`}>{sla.label}</span>
      )}

      {req.trustScore != null && (
        <div className="mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${getTrustScoreBg(req.trustScore)}`}>
            Score: {req.trustScore}/100
          </span>
        </div>
      )}

      {req.status === "pending_payment" && (
        <button
          onClick={e => { e.stopPropagation(); onStartVetting(req.id); }}
          className="mt-2 w-full text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-2 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1"
        >
          <Play className="w-3 h-3" /> Start Vetting
        </button>
      )}

      <p className="text-[10px] text-muted-foreground/50 mt-2">{formatDate(req.createdAt)}</p>
    </div>
  );
}

function KanbanBoard({
  requests, onSelect, onStartVetting,
}: { requests: AdminRequest[]; onSelect: (id: number) => void; onStartVetting: (id: number) => void }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {KANBAN_COLUMNS.map(col => {
        const cards = requests.filter(r => r.status === col.key);
        return (
          <div key={col.key} className="flex flex-col min-w-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl border border-b-0 ${col.border} ${col.head}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
              <span className="text-xs font-semibold text-foreground truncate">{col.label}</span>
              <span className="ml-auto text-xs font-medium text-muted-foreground">{cards.length}</span>
            </div>
            <div className={`flex-1 space-y-2 p-2 rounded-b-xl border ${col.border} bg-muted/20 min-h-[400px]`}>
              {cards.map(req => (
                <KanbanCard key={req.id} req={req} onSelect={onSelect} onStartVetting={onStartVetting} />
              ))}
              {cards.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/40 select-none">
                  No requests
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
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
      toast({ title: status === "completed" ? "Step marked complete" : status === "failed" ? "Step marked failed" : "Step updated" });
    } catch {
      toast({ title: "Failed to update step", variant: "destructive" });
    }
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
      toast({ title: "Reference saved", description: `${refContact.name} — ${CALL_STATUSES.find(s => s.value === callStatus)?.label ?? callStatus}` });
    } catch {
      toast({ title: "Failed to save reference", variant: "destructive" });
    } finally { setSaving(false); }
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
      toast({ title: "Report published", description: "Employer has been notified by email." });
      onCompleted();
    } catch { setError("Failed to publish report. Please try again."); toast({ title: "Failed to publish report", variant: "destructive" }); }
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DOC_LABELS = [
  "DCI Certificate",
  "ID Scan",
  "Reference Letter",
  "Police Clearance",
  "Address Verification",
  "Social Media Report",
  "Other",
];

function OpsDocumentsPanel({ requestId, token }: { requestId: number; token: string | null }) {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [label, setLabel] = useState(DOC_LABELS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    try {
      const data = await apiFetch<{ documents: DocRecord[] }>(`/vetting-requests/${requestId}/documents`, { token });
      setDocs(data.documents ?? []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [requestId, token]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const urlRes = await apiFetch<{ uploadUrl: string; objectPath: string }>(
        "/storage/uploads/request-url",
        { method: "POST", token, body: { fileName: file.name, mimeType: file.type, prefix: "uploads" } }
      );
      await fetch(urlRes.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      await apiFetch(`/vetting-requests/${requestId}/documents`, {
        method: "POST", token,
        body: { fileName: file.name, fileSize: file.size, mimeType: file.type, objectPath: urlRes.objectPath, label },
      });
      toast({ title: "Document uploaded" });
      await loadDocs();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    setDeletingId(docId);
    try {
      await apiFetch(`/vetting-requests/${requestId}/documents/${docId}`, { method: "DELETE", token });
      setDocs(prev => prev.filter(d => d.id !== docId));
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Failed to delete document", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Paperclip className="w-3 h-3" /> Documents
        {docs.length > 0 && (
          <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {docs.length}
          </span>
        )}
      </h3>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />

      <div className="flex gap-2 mb-3">
        <select
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {DOC_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs gap-1.5 shrink-0"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground text-center">
          No documents yet — upload DCI certificates, ID scans, or other evidence
        </div>
      ) : (
        <div className="space-y-1.5">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
              <File className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{doc.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {doc.label && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{doc.label}</span>
                  )}
                  {doc.uploaderRole !== "employer" && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">KenyaVet</span>
                  )}
                  {doc.uploaderRole === "employer" && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">Employer</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`${API_BASE}/storage${doc.objectPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  disabled={deletingId === doc.id}
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
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
                      toast({ title: "Notes saved" });
                    } catch {
                      toast({ title: "Failed to save notes", variant: "destructive" });
                    }
                  }}
                >
                  Save Notes
                </Button>
              </div>
            </div>

            {/* Documents */}
            <OpsDocumentsPanel requestId={detail.id} token={token} />

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

function OpsAnalyticsPanel({ token }: { token: string | null }) {
  const [data, setData] = useState<OpsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<OpsAnalytics>("/ops/analytics", { token })
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="py-20 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
    </div>
  );
  if (!data) return (
    <div className="py-20 text-center text-muted-foreground text-sm">Failed to load analytics.</div>
  );

  const slaColor = (v: number | null) =>
    v == null ? "text-muted-foreground" : v >= 90 ? "text-emerald-600" : v >= 70 ? "text-amber-600" : "text-red-600";
  const slaBarColor = (v: number | null) =>
    v == null ? "bg-gray-200" : v >= 90 ? "bg-emerald-500" : v >= 70 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ClipboardCheck, label: "In Queue", value: data.queue.inProgress, color: "bg-blue-50 text-blue-600", sub: "active" },
          { icon: CheckCircle, label: "Done Today", value: data.queue.completedToday, color: "bg-emerald-50 text-emerald-600", sub: "completed" },
          { icon: TrendingUp, label: "This Week", value: data.queue.completedThisWeek, color: "bg-violet-50 text-violet-600", sub: "completed" },
          { icon: Award, label: "Total Vetted", value: data.queue.completed, color: "bg-amber-50 text-amber-600", sub: "all time" },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <div key={label} className="bg-card rounded-xl border border-card-border p-4 flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground leading-tight">{label} <span className="text-[10px]">({sub})</span></div>
          </div>
        ))}
      </div>

      {/* SLA + Avg time */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-card-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm text-foreground">Overall SLA Adherence</p>
          </div>
          {data.slaAdherence != null ? (
            <>
              <div className={`text-4xl font-black mb-2 ${slaColor(data.slaAdherence)}`}>{data.slaAdherence}%</div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${slaBarColor(data.slaAdherence)}`} style={{ width: `${data.slaAdherence}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Percentage of completed checks delivered within turnaround</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No completed checks yet — SLA data will appear here once reports are published.</p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-card-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm text-foreground">Avg Completion Time</p>
          </div>
          {data.avgCompletionHours != null ? (
            <>
              <div className="text-4xl font-black text-foreground mb-1">{data.avgCompletionHours}h</div>
              <p className="text-xs text-muted-foreground">Average hours from request creation to report published</p>
              <div className="mt-4 flex gap-3 text-xs">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">Target: ≤24h Standard</span>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">≤48h Basic</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No completed checks yet.</p>
          )}
        </div>
      </div>

      {/* Package breakdown */}
      <div className="bg-card rounded-xl border border-card-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-primary" />
          <p className="font-semibold text-sm text-foreground">Breakdown by Package</p>
        </div>
        <div className="space-y-4">
          {data.packageBreakdown.map(pkg => (
            <div key={pkg.slug}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{pkg.name}</span>
                  <span className="text-xs text-muted-foreground">{pkg.total} total · {pkg.completed} done</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {pkg.avgHours != null && <span className="text-muted-foreground">{pkg.avgHours}h avg</span>}
                  {pkg.slaAdherence != null && (
                    <span className={`font-semibold ${slaColor(pkg.slaAdherence)}`}>{pkg.slaAdherence}% SLA</span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-full"
                  style={{ width: pkg.total > 0 ? `${(pkg.completed / pkg.total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step bottlenecks */}
      {data.stepBreakdown.length > 0 && (
        <div className="bg-card rounded-xl border border-card-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm text-foreground">Step Completion Rates</p>
            <span className="text-xs text-muted-foreground ml-1">— lower rates = bottlenecks</span>
          </div>
          <div className="space-y-3">
            {data.stepBreakdown
              .sort((a, b) => a.completionRate - b.completionRate)
              .map(step => (
                <div key={step.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-36 shrink-0 truncate" title={step.name}>{step.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${step.completionRate >= 80 ? "bg-emerald-500" : step.completionRate >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                      style={{ width: `${step.completionRate}%` }}
                    />
                  </div>
                  <div className="text-xs text-right w-20 shrink-0 text-muted-foreground">
                    {step.completionRate}% · {step.completed}/{step.total}
                  </div>
                  {step.failed > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full shrink-0">{step.failed} failed</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
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
  const [activeView, setActiveView] = useState<"queue" | "analytics" | "kanban">("queue");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const queryStatus = activeView === "kanban" ? "all" : statusFilter;
      const data = await apiFetch<{ requests: AdminRequest[] }>(
        `/admin/requests?status=${queryStatus}`,
        { token }
      );
      setRequests(data.requests);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, activeView]);

  useEffect(() => { if (activeView !== "analytics") load(); }, [load, activeView]);

  const startVetting = useCallback(async (id: number) => {
    try {
      await apiFetch(`/admin/requests/${id}/status`, { method: "PATCH", token, body: { status: "in_progress" } });
      toast({ title: "Vetting started", description: "Request moved to In Progress." });
      load();
    } catch {
      toast({ title: "Failed to start vetting", variant: "destructive" });
    }
  }, [token, load]);

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
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
              <button
                onClick={() => setActiveView("queue")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeView === "queue"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> Queue
              </button>
              <button
                onClick={() => setActiveView("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeView === "kanban"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Board
              </button>
              <button
                onClick={() => setActiveView("analytics")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeView === "analytics"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Analytics
              </button>
            </div>
            {(activeView === "queue" || activeView === "kanban") && (
              <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {activeView === "analytics" ? (
          <OpsAnalyticsPanel token={token} />
        ) : activeView === "kanban" ? (
          loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Loading board…</div>
          ) : (
            <KanbanBoard requests={requests} onSelect={setSelected} onStartVetting={startVetting} />
          )
        ) : (
          <>
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
                        {(() => {
                          const sla = getSlaInfo(req);
                          if (!sla.label) return null;
                          return (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                              sla.overdue
                                ? "bg-red-100 text-red-700"
                                : sla.urgent
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-50 text-blue-600"
                            }`}>
                              {sla.label}
                            </span>
                          );
                        })()}
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
