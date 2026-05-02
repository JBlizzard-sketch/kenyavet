import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { User, Phone, MapPin, Mail, Shield, Save, CheckCircle, Lock, Eye, EyeOff, Bell, Copy, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const neighbourhoods = ["Karen", "Runda", "Muthaiga", "Kitisuru", "Gigiri", "Lavington", "Westlands", "Kilimani", "Other"];

interface NotifPrefs {
  report_ready: boolean;
  payment_confirmed: boolean;
  re_vetting_due: boolean;
  weekly_digest: boolean;
}

const NOTIF_LABELS: { key: keyof NotifPrefs; label: string; desc: string }[] = [
  { key: "report_ready", label: "Report ready", desc: "When your vetting report is published" },
  { key: "payment_confirmed", label: "Payment confirmed", desc: "M-Pesa payment receipt confirmation" },
  { key: "re_vetting_due", label: "Re-vetting reminders", desc: "When a staff member is due for renewal" },
  { key: "weekly_digest", label: "Weekly digest", desc: "Summary of activity every Monday" },
];

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

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    report_ready: true, payment_confirmed: true, re_vetting_due: true, weekly_digest: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);

  const [referralStats, setReferralStats] = useState<{ referralCode: string | null; creditBalance: number; referralCount: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ referralCode: string | null; creditBalance: number; referralCount: number }>("/auth/me/referral", { token })
      .then(data => setReferralStats(data))
      .catch(() => {});
  }, [token]);

  const referralLink = referralStats?.referralCode
    ? `${window.location.origin}/register?ref=${referralStats.referralCode}`
    : "";

  function handleCopyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied!", description: "Share it with friends to earn KSh 500 each." });
    });
  }

  useEffect(() => {
    if (!token) return;
    apiFetch<{ prefs: NotifPrefs }>("/auth/me/notifications", { token })
      .then(data => setNotifPrefs(data.prefs))
      .catch(() => {});
  }, [token]);

  async function handleNotifToggle(key: keyof NotifPrefs) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setNotifSaving(true);
    try {
      const result = await apiFetch<{ prefs: NotifPrefs }>("/auth/me/notifications", {
        method: "PATCH",
        token,
        body: { [key]: !notifPrefs[key] },
      });
      setNotifPrefs(result.prefs);
      toast({ title: "Preferences saved" });
    } catch {
      setNotifPrefs(notifPrefs);
      toast({ title: "Failed to save preferences", variant: "destructive" });
    } finally {
      setNotifSaving(false);
    }
  }

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

        {/* Notification preferences */}
        <div className="bg-card rounded-xl border border-card-border p-6">
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" /> Email Notifications
          </h2>
          <p className="text-xs text-muted-foreground mb-5">Choose which emails you receive from KenyaVet</p>
          <div className="space-y-1">
            {NOTIF_LABELS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNotifToggle(key)}
                  disabled={notifSaving}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    notifPrefs[key] ? "bg-primary" : "bg-muted"
                  } disabled:opacity-50`}
                  role="switch"
                  aria-checked={notifPrefs[key]}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifPrefs[key] ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Note: Transactional emails (payment receipts, report delivery) are always sent regardless of these settings.
          </p>
        </div>

        {/* Refer & Earn */}
        <div className="bg-card rounded-xl border border-card-border p-6">
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" /> Refer &amp; Earn
          </h2>
          <p className="text-xs text-muted-foreground mb-5">
            Share your referral link. Earn <span className="font-semibold text-foreground">KSh 500</span> credit for every friend who joins KenyaVet.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center border border-emerald-100 dark:border-emerald-800">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{referralStats?.referralCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Friends referred
              </p>
            </div>
            <div className="bg-primary/5 rounded-xl p-4 text-center border border-primary/10">
              <p className="text-2xl font-bold text-primary">KSh {(referralStats?.creditBalance ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Credits earned</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your referral link</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={referralLink || "Loading…"}
                className="font-mono text-xs bg-muted/40"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={handleCopyLink}
                disabled={!referralLink}
              >
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your code: <span className="font-mono font-semibold text-foreground">{referralStats?.referralCode ?? "—"}</span>
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
