import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { User, Phone, MapPin, Mail, Shield, Save, CheckCircle, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const neighbourhoods = ["Karen", "Runda", "Muthaiga", "Kitisuru", "Gigiri", "Lavington", "Westlands", "Kilimani", "Other"];

export default function Profile() {
  const { user, token, login } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    neighbourhood: user?.neighbourhood ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await apiFetch<typeof user>("/auth/me/update", {
        method: "PATCH",
        token,
        body: { name: form.name, phone: form.phone, neighbourhood: form.neighbourhood },
      });
      if (updated && token) {
        login(token, updated as any);
      }
      setSaved(true);
      toast({ title: "Profile saved", description: "Your details have been updated." });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
      toast({ title: "Failed to save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSaved(false);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords do not match"); return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters"); return;
    }
    setPwSaving(true);
    try {
      await apiFetch("/auth/me/password", {
        method: "PATCH",
        token,
        body: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
      });
      setPwSaved(true);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password updated", description: "Your new password is active." });
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to update password");
      toast({ title: "Failed to update password", variant: "destructive" });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-serif font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your account details and security</p>
        </div>

        {/* Avatar card */}
        <div className="bg-card rounded-xl border border-card-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary text-2xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full capitalize font-medium">
                <Shield className="w-3 h-3" />
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-card rounded-xl border border-card-border p-6">
          <h2 className="font-semibold text-foreground mb-5">Personal Information</h2>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
              </Label>
              <Input value={user?.email ?? ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number</span>
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="+254722..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Neighbourhood</span>
              </Label>
              <Select value={form.neighbourhood} onValueChange={v => set("neighbourhood", v)}>
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

            <div className="pt-2 flex items-center gap-3">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? "Saving…" : <><Save className="w-4 h-4" /> Save Changes</>}
              </Button>
              {saved && (
                <span className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-card rounded-xl border border-card-border p-6">
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" /> Change Password
          </h2>
          <p className="text-xs text-muted-foreground mb-5">Use a strong password of at least 8 characters</p>

          {pwError && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100 mb-4">
              {pwError}
            </div>
          )}
          {pwSaved && (
            <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2.5 rounded-lg border border-emerald-100 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Password updated successfully
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPw">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPw"
                  type={showCurrent ? "text" : "password"}
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPw">New Password</Label>
              <div className="relative">
                <Input
                  id="newPw"
                  type={showNew ? "text" : "password"}
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                  minLength={8}
                  className="pr-10"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwForm.newPassword && (
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex gap-0.5">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 w-6 rounded-full transition-colors ${
                          pwForm.newPassword.length > i * 2 + 2
                            ? pwForm.newPassword.length >= 12 ? "bg-emerald-500"
                              : pwForm.newPassword.length >= 8 ? "bg-amber-500"
                              : "bg-red-400"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {pwForm.newPassword.length < 8 ? "Too short" : pwForm.newPassword.length < 12 ? "Acceptable" : "Strong"}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPw">Confirm New Password</Label>
              <Input
                id="confirmPw"
                type="password"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
                placeholder="Repeat new password"
              />
              {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="outline"
                disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword}
                className="gap-2"
              >
                {pwSaving ? "Updating…" : <><Lock className="w-4 h-4" /> Update Password</>}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
