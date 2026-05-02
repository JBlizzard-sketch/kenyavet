import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatKsh } from "@/lib/utils";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
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

const roles = ["Housekeeper", "Driver", "Nanny", "Cook", "Gardener", "Security Guard", "House Manager", "Other"];

export default function NewVettingRequest() {
  const [, navigate] = useLocation();
  const { token } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [form, setForm] = useState({
    workerName: "", workerRole: "", workerIdNumber: "", workerPhone: "",
    workerEmail: "", notes: "", packageId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ packages: Package[] }>("/packages").then(d => {
      setPackages(d.packages);
      const standard = d.packages.find(p => p.slug === "standard");
      if (standard) {
        setSelectedPkg(standard);
        setForm(f => ({ ...f, packageId: String(standard.id) }));
      }
    }).catch(() => {});
  }, []);

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function selectPackage(pkg: Package) {
    setSelectedPkg(pkg);
    set("packageId", String(pkg.id));
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
        body: JSON.stringify({
          workerName: form.workerName,
          workerRole: form.workerRole,
          workerIdNumber: form.workerIdNumber,
          workerPhone: form.workerPhone || null,
          workerEmail: form.workerEmail || null,
          notes: form.notes || null,
          packageId: Number(form.packageId),
        }),
      });
      navigate(`/vetting-requests/${data.request.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate("/vetting-requests")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to requests
        </button>

        <h1 className="text-2xl font-serif font-bold text-foreground mb-1">New Vetting Request</h1>
        <p className="text-muted-foreground text-sm mb-8">Submit a domestic worker for background verification</p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          {/* Left: form fields */}
          <div className="lg:col-span-2 space-y-6">
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
                      <Clock className="w-3 h-3" /> {pkg.turnaroundHours}h turnaround
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
