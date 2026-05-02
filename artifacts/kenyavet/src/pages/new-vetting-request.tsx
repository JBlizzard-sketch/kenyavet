import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatKsh } from "@/lib/utils";
import { ArrowLeft, CheckCircle, Clock, Plus, Trash2, Phone, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Package {
  id: number;
  name: string;
  slug: string;
  priceKsh: number;
  description: string;
  features: string[];
  turnaroundHours: number;
  popular: boolean;
}

interface RefContact {
  name: string;
  phone: string;
  relationship: string;
  employerName: string;
  yearsWorked: string;
}

const emptyRef = (): RefContact => ({ name: "", phone: "", relationship: "", employerName: "", yearsWorked: "" });

const roles = ["Housekeeper", "Driver", "Nanny", "Cook", "Gardener", "Security Guard", "House Manager", "Other"];
const relationships = ["Previous Employer", "Current Employer", "Colleague", "Neighbour", "Community Leader", "Other"];

function refCountForPkg(slug: string) {
  if (slug === "premium") return 3;
  if (slug === "standard") return 2;
  return 1;
}

export default function NewVettingRequest() {
  const [, navigate] = useLocation();
  const { token } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [form, setForm] = useState({
    workerName: "", workerRole: "", workerIdNumber: "", workerPhone: "",
    workerEmail: "", notes: "", packageId: "",
  });
  const [refs, setRefs] = useState<RefContact[]>([emptyRef()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillName = params.get("workerName") ?? "";
    const prefillRole = params.get("workerRole") ?? "";
    const prefillId = params.get("workerIdNumber") ?? "";
    const prefillPhone = params.get("workerPhone") ?? "";
    if (prefillName || prefillRole || prefillId) {
      setForm(f => ({
        ...f,
        workerName: prefillName,
        workerRole: prefillRole,
        workerIdNumber: prefillId,
        workerPhone: prefillPhone,
      }));
      setPrefilled(true);
    }
  }, []);

  useEffect(() => {
    apiFetch<{ packages: Package[] }>("/packages").then(d => {
      setPackages(d.packages);
      const standard = d.packages.find(p => p.slug === "standard");
      if (standard) {
        setSelectedPkg(standard);
        setForm(f => ({ ...f, packageId: String(standard.id) }));
        setRefs(Array.from({ length: refCountForPkg(standard.slug) }, emptyRef));
      }
    }).catch(() => {});
  }, []);

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function selectPackage(pkg: Package) {
    setSelectedPkg(pkg);
    set("packageId", String(pkg.id));
    const needed = refCountForPkg(pkg.slug);
    setRefs(prev => {
      const next = [...prev];
      while (next.length < needed) next.push(emptyRef());
      return next.slice(0, needed);
    });
  }

  function setRef(i: number, k: keyof RefContact, v: string) {
    setRefs(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.packageId) { setError("Please select a package"); return; }
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<{ request: { id: number } }>("/vetting-requests", {
        method: "POST",
        token,
        body: {
          workerName: form.workerName,
          workerRole: form.workerRole,
          workerIdNumber: form.workerIdNumber,
          workerPhone: form.workerPhone || null,
          workerEmail: form.workerEmail || null,
          notes: form.notes || null,
          packageId: Number(form.packageId),
        },
      });
      const requestId = data.request.id;

      // Post reference contacts that have at least a name and phone
      const validRefs = refs.filter(r => r.name.trim() && r.phone.trim());
      for (const ref of validRefs) {
        await apiFetch(`/vetting-requests/${requestId}/references`, {
          method: "POST",
          token,
          body: {
            name: ref.name.trim(),
            phone: ref.phone.trim(),
            relationship: ref.relationship || "Previous Employer",
            employerName: ref.employerName.trim() || "Not specified",
            yearsWorked: ref.yearsWorked ? Number(ref.yearsWorked) : null,
          },
        }).catch(() => {});
      }

      navigate(`/vetting-requests/${requestId}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  }

  const refCount = selectedPkg ? refCountForPkg(selectedPkg.slug) : 1;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate("/vetting-requests")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to requests
        </button>

        <h1 className="text-2xl font-serif font-bold text-foreground mb-1">New Vetting Request</h1>
        <p className="text-muted-foreground text-sm mb-4">Submit a domestic worker for background verification</p>
        {prefilled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-6 flex items-center gap-2 text-sm text-blue-800">
            <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
            Worker details pre-filled from a previous request — review and update as needed before submitting.
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Worker details */}
            <div className="bg-card rounded-xl border border-card-border p-6">
              <h2 className="font-semibold text-foreground mb-5">Worker Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="workerName">Full Name *</Label>
                  <Input id="workerName" placeholder="Grace Wanjiru" value={form.workerName} onChange={e => set("workerName", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <Select onValueChange={v => set("workerRole", v)}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="workerIdNumber">National ID Number *</Label>
                  <Input id="workerIdNumber" placeholder="12345678" value={form.workerIdNumber} onChange={e => set("workerIdNumber", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="workerPhone">Phone Number</Label>
                  <Input id="workerPhone" placeholder="+254722..." value={form.workerPhone} onChange={e => set("workerPhone", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="workerEmail">Email (optional)</Label>
                  <Input id="workerEmail" type="email" placeholder="worker@example.com" value={form.workerEmail} onChange={e => set("workerEmail", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea id="notes" placeholder="Any specific areas of concern or context about this worker…" value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} />
                </div>
              </div>
            </div>

            {/* Reference contacts */}
            <div className="bg-card rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    Reference Contacts
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {refCount} required
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Our team will call these contacts to verify the worker's history and character
                  </p>
                </div>
              </div>

              <div className="space-y-5 mt-5">
                {refs.map((ref, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        Reference {i + 1}
                        {i < refCount && <span className="text-xs text-muted-foreground">(required)</span>}
                      </h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Full Name *</Label>
                        <Input
                          placeholder="John Mwangi"
                          value={ref.name}
                          onChange={e => setRef(i, "name", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone Number *</Label>
                        <Input
                          placeholder="+254722..."
                          value={ref.phone}
                          onChange={e => setRef(i, "phone", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Relationship</Label>
                        <Select value={ref.relationship} onValueChange={v => setRef(i, "relationship", v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {relationships.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Their Organisation / Home</Label>
                        <Input
                          placeholder="Wanjiku Household, Karen"
                          value={ref.employerName}
                          onChange={e => setRef(i, "employerName", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Years Known</Label>
                        <Input
                          type="number"
                          placeholder="2"
                          min="0" max="30"
                          value={ref.yearsWorked}
                          onChange={e => setRef(i, "yearsWorked", e.target.value)}
                          className="h-8 text-sm w-24"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Package selection */}
            <div className="bg-card rounded-xl border border-card-border p-6">
              <h2 className="font-semibold text-foreground mb-5">Select Package</h2>
              <div className="space-y-3">
                {packages.map(pkg => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => selectPackage(pkg)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      selectedPkg?.id === pkg.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{pkg.name}</span>
                        {pkg.popular && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>}
                      </div>
                      <span className="font-bold text-foreground">{formatKsh(pkg.priceKsh)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Clock className="w-3 h-3" /> {pkg.turnaroundHours}h turnaround ·
                      <span className="ml-1">{refCountForPkg(pkg.slug)} reference call{refCountForPkg(pkg.slug) > 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {pkg.features.slice(0, 4).map(f => (
                        <span key={f} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> {f}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: summary */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-card-border p-5 sticky top-6">
              <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
              {selectedPkg ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Package</span>
                      <span className="font-medium">{selectedPkg.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Turnaround</span>
                      <span>{selectedPkg.turnaroundHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">References</span>
                      <span>{refCountForPkg(selectedPkg.slug)} call{refCountForPkg(selectedPkg.slug) > 1 ? "s" : ""}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatKsh(selectedPkg.priceKsh)}</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedPkg.features.map(f => (
                      <div key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" /> {f}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a package to see details</p>
              )}

              <Button type="submit" className="w-full mt-5" disabled={loading || !selectedPkg}>
                {loading ? "Submitting…" : "Submit Request"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">Payment instructions will follow</p>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
