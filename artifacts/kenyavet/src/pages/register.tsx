import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Shield, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const neighbourhoods = ["Karen", "Runda", "Muthaiga", "Kitisuru", "Gigiri", "Lavington", "Westlands", "Kilimani", "Other"];

export default function Register() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", neighbourhood: "", referralCode: "",
  });
  const [referralBanner, setReferralBanner] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setForm(f => ({ ...f, referralCode: ref.toUpperCase() }));
      setReferralBanner(true);
    }
  }, []);

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, string> = { ...form, role: "employer" };
      if (!body.referralCode) delete body.referralCode;
      const data = await apiFetch<{ token: string; user: any }>("/auth/register", {
        method: "POST",
        body,
      });
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-lg">KenyaVet</span>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Start vetting your domestic staff today</p>
        </div>

        {referralBanner && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <Gift className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">You were invited!</p>
              <p className="text-xs text-emerald-700">Your friend earns KSh 500 credit when you join.</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Jane Mwangi" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+254722..." value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Neighbourhood</Label>
              <Select onValueChange={v => set("neighbourhood", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your area" />
                </SelectTrigger>
                <SelectContent>
                  {neighbourhoods.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => set("password", e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referralCode" className="flex items-center gap-1.5 text-muted-foreground">
                <Gift className="w-3.5 h-3.5" /> Referral code <span className="text-xs">(optional)</span>
              </Label>
              <Input
                id="referralCode"
                placeholder="e.g. KVAB12CD"
                value={form.referralCode}
                onChange={e => set("referralCode", e.target.value.toUpperCase())}
                className="uppercase tracking-widest font-mono text-sm"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
