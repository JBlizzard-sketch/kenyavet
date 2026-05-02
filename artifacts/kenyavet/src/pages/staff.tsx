import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDate, getTrustScoreBg } from "@/lib/utils";
import { Plus, UserCog, Shield, Phone, QrCode, CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QrCard from "@/components/QrCard";

interface StaffRecord {
  id: number;
  workerName: string;
  role: string;
  phone: string | null;
  startDate: string | null;
  trustScore: number | null;
  status: string;
  notes: string | null;
  renewalDueAt: string | null;
  createdAt: string;
}

interface CompletedRequest {
  id: number;
  workerName: string;
  workerRole: string;
  trustScore: number | null;
  reportId: number | null;
  createdAt: string;
}

const roles = ["Housekeeper", "Driver", "Nanny", "Cook", "Gardener", "Security Guard", "House Manager", "Other"];

export default function Staff() {
  const { token } = useAuth();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [completedRequests, setCompletedRequests] = useState<CompletedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ workerName: "", role: "", phone: "", startDate: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addingFromReq, setAddingFromReq] = useState<number | null>(null);
  const [qrTarget, setQrTarget] = useState<StaffRecord | null>(null);

  async function loadStaff() {
    try {
      const [staffData, reqData] = await Promise.all([
        apiFetch<{ staff: StaffRecord[] }>("/staff", { token }),
        apiFetch<{ requests: CompletedRequest[] }>("/vetting-requests?status=completed", { token }).catch(() => ({ requests: [] })),
      ]);
      setStaff(staffData.staff);
      setCompletedRequests(reqData.requests ?? []);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStaff(); }, [token]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/staff", {
        method: "POST", token,
        body: {
          workerName: form.workerName, role: form.role,
          phone: form.phone || null, startDate: form.startDate || null, notes: form.notes || null,
        },
      });
      setShowAdd(false);
      setForm({ workerName: "", role: "", phone: "", startDate: "", notes: "" });
      loadStaff();
      toast({ title: "Staff member added", description: `${form.workerName} added to your roster.` });
    } catch (err: any) {
      setError(err.message || "Failed to add staff member");
      toast({ title: "Failed to add staff member", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function addFromRequest(reqId: number) {
    setAddingFromReq(reqId);
    try {
      await apiFetch(`/staff/from-request/${reqId}`, { method: "POST", token, body: {} });
      loadStaff();
      toast({ title: "Added to roster", description: "Worker has been added to your staff list." });
    } catch (err: any) {
      toast({ title: "Failed to add to roster", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setAddingFromReq(null);
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      await apiFetch(`/staff/${id}`, { method: "PATCH", token, body: { status } });
      loadStaff();
      toast({ title: status === "active" ? "Staff member reactivated" : "Staff member marked inactive" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  }

  const active = staff.filter(s => s.status === "active");
  const inactive = staff.filter(s => s.status !== "active");
  const now = Date.now();
  const overdueStaff = active.filter(s => s.renewalDueAt && new Date(s.renewalDueAt).getTime() < now);
  const dueSoonStaff = active.filter(s => {
    if (!s.renewalDueAt) return false;
    const ts = new Date(s.renewalDueAt).getTime();
    return ts >= now && ts < now + 60 * 24 * 60 * 60 * 1000;
  });

  // Completed requests not yet in staff roster
  const staffedRequestIds = new Set<number>(); // We don't have vettingRequestId on staff yet so show all
  const unrosteredRequests = completedRequests.filter(r =>
    !staff.some(s => s.workerName === r.workerName && s.role === r.workerRole)
  );

  // Find completed request for QR (match by name+role)
  function getReportForStaff(member: StaffRecord): CompletedRequest | undefined {
    return completedRequests.find(r => r.workerName === member.workerName && r.workerRole === member.role && r.reportId != null);
  }

  return (
    <AppLayout>
      {qrTarget && (() => {
        const req = getReportForStaff(qrTarget);
        if (!req?.reportId) return null;
        return (
          <QrCard
            reportId={req.reportId}
            workerName={qrTarget.workerName}
            workerRole={qrTarget.role}
            trustScore={qrTarget.trustScore ?? 0}
            generatedDate={qrTarget.createdAt}
            onClose={() => setQrTarget(null)}
          />
        );
      })()}

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">My Staff</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{active.length} active · {inactive.length} inactive</p>
          </div>
          <Button className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Staff Member
          </Button>
        </div>

        {/* Re-vetting overdue banner */}
        {(overdueStaff.length > 0 || dueSoonStaff.length > 0) && (
          <div className={`rounded-xl border p-4 mb-6 ${overdueStaff.length > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
            <p className={`text-sm font-semibold mb-1 flex items-center gap-1.5 ${overdueStaff.length > 0 ? "text-red-800" : "text-amber-800"}`}>
              <CalendarClock className="w-4 h-4" />
              {overdueStaff.length > 0
                ? `${overdueStaff.length} staff member${overdueStaff.length !== 1 ? "s" : ""} overdue for re-vetting`
                : `${dueSoonStaff.length} staff member${dueSoonStaff.length !== 1 ? "s" : ""} due for re-vetting soon`}
            </p>
            <p className={`text-xs mb-3 ${overdueStaff.length > 0 ? "text-red-700" : "text-amber-700"}`}>
              Annual re-vetting keeps your household protected and maintains trust scores.
            </p>
            <Link href="/vetting-requests/new">
              <Button size="sm" variant="outline" className={`gap-1.5 text-xs ${overdueStaff.length > 0 ? "border-red-300 text-red-700 hover:bg-red-100" : "border-amber-300 text-amber-700 hover:bg-amber-100"}`}>
                <Shield className="w-3 h-3" /> Schedule Re-Vetting
              </Button>
            </Link>
          </div>
        )}

        {/* Add from completed requests banner */}
        {unrosteredRequests.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {unrosteredRequests.length} vetted worker{unrosteredRequests.length !== 1 ? "s" : ""} ready to add to your roster
            </p>
            <div className="space-y-2">
              {unrosteredRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-white rounded-lg border border-emerald-100 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary text-xs font-bold">{req.workerName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{req.workerName}</p>
                      <p className="text-xs text-muted-foreground">{req.workerRole}</p>
                    </div>
                    {req.trustScore != null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getTrustScoreBg(req.trustScore)}`}>
                        {req.trustScore}/100
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    disabled={addingFromReq === req.id}
                    onClick={() => addFromRequest(req.id)}
                  >
                    {addingFromReq === req.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Plus className="w-3 h-3" />}
                    Add to Roster
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual add form */}
        {showAdd && (
          <div className="bg-card rounded-xl border border-card-border p-6 mb-6">
            <h2 className="font-semibold text-foreground mb-4">Add Staff Member Manually</h2>
            {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100 mb-4">{error}</div>}
            <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input placeholder="Grace Wanjiru" value={form.workerName} onChange={e => set("workerName", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select onValueChange={v => set("role", v)}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+254722..." value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Input placeholder="Any notes…" value={form.notes} onChange={e => set("notes", e.target.value)} />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Staff Member"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center">
            <UserCog className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No staff members yet.</p>
            <Button size="sm" className="mt-4" onClick={() => setShowAdd(true)}>Add first staff member</Button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active Staff</h2>
                <div className="space-y-3">
                  {active.map(member => <StaffCard key={member.id} member={member} onStatusChange={updateStatus} onQr={setQrTarget} hasReport={!!getReportForStaff(member)} />)}
                </div>
              </div>
            )}
            {inactive.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Inactive</h2>
                <div className="space-y-3 opacity-70">
                  {inactive.map(member => <StaffCard key={member.id} member={member} onStatusChange={updateStatus} onQr={setQrTarget} hasReport={!!getReportForStaff(member)} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StaffCard({ member, onStatusChange, onQr, hasReport }: {
  member: StaffRecord;
  onStatusChange: (id: number, status: string) => void;
  onQr: (m: StaffRecord) => void;
  hasReport: boolean;
}) {
  const now = Date.now();
  const renewalTs = member.renewalDueAt ? new Date(member.renewalDueAt).getTime() : null;
  const renewalOverdue = renewalTs != null && renewalTs < now;
  const renewalSoon = renewalTs != null && !renewalOverdue && renewalTs < now + 60 * 24 * 60 * 60 * 1000;

  return (
    <div className="bg-card rounded-xl border border-card-border p-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-primary font-bold text-sm">{member.workerName.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-sm">{member.workerName}</p>
            {member.status === "active" ? (
              <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Active</span>
            ) : (
              <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">{member.status}</span>
            )}
            {member.trustScore != null && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getTrustScoreBg(member.trustScore)}`}>
                Score: {member.trustScore}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-1">
            <span>{member.role}</span>
            {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>}
            {member.startDate && <span>Since {formatDate(member.startDate)}</span>}
          </div>
          {renewalOverdue && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5 font-medium">
              <CalendarClock className="w-3 h-3" /> Re-vetting overdue — renewal past {member.renewalDueAt ? new Date(member.renewalDueAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : ""}
            </p>
          )}
          {renewalSoon && !renewalOverdue && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1.5">
              <CalendarClock className="w-3 h-3" /> Re-vetting due {member.renewalDueAt ? new Date(member.renewalDueAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "soon"}
            </p>
          )}
          {member.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{member.notes}"</p>}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasReport && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onQr(member)}>
              <QrCode className="w-3 h-3" /> QR
            </Button>
          )}
          <Link href="/vetting-requests/new">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Shield className="w-3 h-3" /> Re-Vet
            </Button>
          </Link>
          {member.status === "active" ? (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => onStatusChange(member.id, "inactive")}>
              Deactivate
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => onStatusChange(member.id, "active")}>
              Activate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
