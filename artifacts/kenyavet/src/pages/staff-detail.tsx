import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDate, getTrustScoreBg } from "@/lib/utils";
import {
  ArrowLeft, UserCog, Phone, CalendarClock, Shield, FileText,
  CheckCircle, Clock, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface StaffMember {
  id: number;
  workerName: string;
  role: string;
  phone: string | null;
  startDate: string | null;
  trustScore: number | null;
  status: string;
  notes: string | null;
  renewalDueAt: string | null;
  vettingRequestId: number | null;
  createdAt: string;
}

export default function StaffDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<StaffMember>(`/staff/${id}`, { token })
      .then(setMember)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function toggleStatus() {
    if (!member) return;
    setToggling(true);
    try {
      const newStatus = member.status === "active" ? "inactive" : "active";
      const updated = await apiFetch<StaffMember>(`/staff/${member.id}`, {
        method: "PATCH", token,
        body: { status: newStatus },
      });
      setMember(updated);
      toast({ title: newStatus === "active" ? "Staff member reactivated" : "Staff member deactivated" });
    } catch {
      toast({ title: "Could not update status", variant: "destructive" });
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <AppLayout><div className="p-6 text-muted-foreground text-sm">Loading…</div></AppLayout>;
  if (notFound || !member) return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <UserCog className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-lg font-semibold text-foreground mb-1">Staff member not found</p>
        <Link href="/staff"><Button variant="outline">Back to Staff</Button></Link>
      </div>
    </AppLayout>
  );

  const now = Date.now();
  const renewalTs = member.renewalDueAt ? new Date(member.renewalDueAt).getTime() : null;
  const renewalOverdue = renewalTs != null && renewalTs < now;
  const renewalSoon = renewalTs != null && !renewalOverdue && renewalTs < now + 60 * 24 * 60 * 60 * 1000;
  const daysUntilRenewal = renewalTs != null ? Math.ceil((renewalTs - now) / 86400000) : null;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/staff">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Staff
          </button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: identity */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-card-border p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-primary text-3xl font-bold">{member.workerName.charAt(0)}</span>
              </div>
              <h1 className="text-xl font-serif font-bold text-foreground">{member.workerName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{member.role}</p>

              <div className="mt-3 flex justify-center">
                <span className={`text-xs px-3 py-1 rounded-full font-medium border ${member.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-muted text-muted-foreground border-border"
                }`}>
                  {member.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              {member.trustScore != null && (
                <div className="mt-4">
                  <span className={`text-lg font-bold px-4 py-2 rounded-xl inline-block ${getTrustScoreBg(member.trustScore)}`}>
                    {member.trustScore}/100
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Trust Score</p>
                </div>
              )}

              <div className="mt-5 space-y-2 text-sm text-muted-foreground text-left">
                {member.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" /> {member.phone}
                  </div>
                )}
                {member.startDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" /> Since {formatDate(member.startDate)}
                  </div>
                )}
              </div>

              {member.notes && (
                <p className="mt-4 text-xs text-muted-foreground italic bg-muted/40 rounded-lg px-3 py-2 text-left">
                  "{member.notes}"
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Link href={`/vetting-requests/new?workerName=${encodeURIComponent(member.workerName)}&workerRole=${encodeURIComponent(member.role)}${member.phone ? `&workerPhone=${encodeURIComponent(member.phone)}` : ""}`}>
                <Button className="w-full gap-2" size="sm">
                  <Shield className="w-3.5 h-3.5" /> Submit Re-Vetting
                </Button>
              </Link>
              {member.vettingRequestId && (
                <Link href={`/vetting-requests/${member.vettingRequestId}`}>
                  <Button variant="outline" className="w-full gap-2" size="sm">
                    <FileText className="w-3.5 h-3.5" /> View Vetting Request
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                className="w-full text-sm"
                size="sm"
                onClick={toggleStatus}
                disabled={toggling}
              >
                {toggling ? "Updating…" : member.status === "active" ? "Deactivate Staff Member" : "Reactivate Staff Member"}
              </Button>
            </div>
          </div>

          {/* Right: details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Renewal status */}
            <div className={`rounded-xl border p-5 ${
              renewalOverdue ? "bg-red-50 border-red-200"
              : renewalSoon ? "bg-amber-50 border-amber-200"
              : "bg-card border-card-border"
            }`}>
              <h2 className={`font-semibold flex items-center gap-2 mb-3 ${
                renewalOverdue ? "text-red-800" : renewalSoon ? "text-amber-800" : "text-foreground"
              }`}>
                <CalendarClock className="w-4 h-4" /> Re-Vetting Schedule
              </h2>
              <div className="space-y-3 text-sm">
                {member.startDate && (
                  <div className="flex justify-between items-center py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Employment start</span>
                    <span className="font-medium">{formatDate(member.startDate)}</span>
                  </div>
                )}
                {member.renewalDueAt && (
                  <div className="flex justify-between items-center py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Annual re-vetting due</span>
                    <span className={`font-medium ${renewalOverdue ? "text-red-700" : renewalSoon ? "text-amber-700" : "text-foreground"}`}>
                      {new Date(member.renewalDueAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2.5 pt-1">
                  {renewalOverdue ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  ) : renewalSoon ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm ${renewalOverdue ? "text-red-700 font-medium" : renewalSoon ? "text-amber-700 font-medium" : "text-muted-foreground"}`}>
                    {renewalOverdue
                      ? `Re-vetting is ${Math.abs(daysUntilRenewal ?? 0)} days overdue — schedule immediately`
                      : renewalSoon
                      ? `Re-vetting due in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? "s" : ""}`
                      : daysUntilRenewal != null
                      ? `Next re-vetting due in ${daysUntilRenewal} days`
                      : "Re-vetting schedule not set"}
                  </p>
                </div>
              </div>
            </div>

            {/* Staff record */}
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Staff Record</h2>
              <div className="space-y-0 divide-y divide-border">
                {[
                  { label: "KenyaVet Staff ID", value: `KVS-${member.id.toString().padStart(4, "0")}` },
                  { label: "Role", value: member.role },
                  { label: "Status", value: member.status === "active" ? "Active" : "Inactive" },
                  { label: "Added to roster", value: formatDate(member.createdAt) },
                  member.startDate ? { label: "Employment start", value: formatDate(member.startDate) } : null,
                  member.vettingRequestId ? { label: "Vetting Request", value: `#${member.vettingRequestId}` } : null,
                  member.trustScore != null ? { label: "Trust Score", value: `${member.trustScore}/100` } : null,
                ].filter(Boolean).map(row => row && (
                  <div key={row.label} className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {member.notes && (
              <div className="bg-card rounded-xl border border-card-border p-5">
                <h2 className="font-semibold text-foreground mb-3">Notes</h2>
                <p className="text-sm text-foreground leading-relaxed italic">"{member.notes}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
