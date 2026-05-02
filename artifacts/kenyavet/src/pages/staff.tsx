import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, getTrustScoreBg } from "@/lib/utils";
import { Plus, UserCog, Shield, Phone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StaffRecord {
  id: number;
  workerName: string;
  role: string;
  phone: string | null;
  startDate: string | null;
  trustScore: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const roles = ["Housekeeper", "Driver", "Nanny", "Cook", "Gardener", "Security Guard", "House Manager", "Other"];

export default function Staff() {
  const { token } = useAuth();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ workerName: "", role: "", phone: "", startDate: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadStaff() {
    try {
      const data = await apiFetch<{ staff: StaffRecord[] }>("/staff", { token });
      setStaff(data.staff);
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
        method: "POST",
        token,
        body: JSON.stringify({
          workerName: form.workerName,
          role: form.role,
          phone: form.phone || null,
          startDate: form.startDate || null,
          notes: form.notes || null,
        }),
      });
      setShowAdd(false);
      setForm({ workerName: "", role: "", phone: "", startDate: "", notes: "" });
      loadStaff();
    } catch (err: any) {
      setError(err.message || "Failed to add staff member");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      await apiFetch(`/staff/${id}`, { method: "PATCH", token, body: JSON.stringify({ status }) });
      loadStaff();
    } catch {}
  }

  const active = staff.filter(s => s.status === "active");
  const inactive = staff.filter(s => s.status !== "active");

  return (
    <AppLayout>
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

        {/* Add form */}
        {showAdd && (
          <div className="bg-card rounded-xl border border-card-border p-6 mb-6">
            <h2 className="font-semibold text-foreground mb-4">Add Staff Member</h2>
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
          <div className="space-y-3">
            {staff.map(member => (
              <div key={member.id} className="bg-card rounded-xl border border-card-border p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">{member.workerName.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm">{member.workerName}</p>
                    {member.status === "active" ? (
                      <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">{member.status}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                    <span>{member.role}</span>
                    {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>}
                    {member.startDate && <span>Since {formatDate(member.startDate)}</span>}
                    {member.trustScore != null && (
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${getTrustScoreBg(member.trustScore)}`}>
                        Score: {member.trustScore}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/vetting-requests/new">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                      <Shield className="w-3 h-3" /> Re-Vet
                    </Button>
                  </Link>
                  {member.status === "active" ? (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(member.id, "inactive")}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(member.id, "active")}>
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
