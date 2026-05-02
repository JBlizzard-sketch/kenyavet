import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { User, Phone, MapPin, Mail, Shield, Save, CheckCircle } from "lucide-react";
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save changes";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your account details</p>
        </div>

        {/* Avatar */}
        <div className="bg-card rounded-xl border border-card-border p-6 mb-5">
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

        {/* Edit form */}
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
                {saving ? "Saving…" : <>
                  <Save className="w-4 h-4" /> Save Changes
                </>}
              </Button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Account info */}
        <div className="bg-card rounded-xl border border-card-border p-6 mt-5">
          <h2 className="font-semibold text-foreground mb-4">Account Details</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account type</span>
              <span className="capitalize font-medium">{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Neighbourhood</span>
              <span>{user?.neighbourhood || "Not set"}</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
