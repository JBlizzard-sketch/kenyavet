import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Shield, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api";

export default function ResetPassword() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";
  const [, navigate] = useLocation();

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h2 className="font-semibold text-foreground mb-2">Invalid reset link</h2>
          <p className="text-sm text-muted-foreground mb-4">This link is missing a reset token. Please request a new one.</p>
          <Link href="/forgot-password">
            <Button variant="outline" size="sm">Request new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">KenyaVet</h1>
          <p className="text-muted-foreground text-sm mt-1">Set a new password</p>
        </div>

        <div className="bg-card rounded-2xl border border-card-border shadow-sm p-8">
          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="font-semibold text-foreground text-lg mb-2">Password updated!</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-foreground text-lg mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" /> Choose a new password
              </h2>
              <p className="text-sm text-muted-foreground mb-6">Use at least 8 characters.</p>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="newPw">New password</Label>
                  <div className="relative">
                    <Input
                      id="newPw"
                      type={showNew ? "text" : "password"}
                      value={form.newPassword}
                      onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.newPassword.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex gap-0.5">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 w-6 rounded-full transition-colors ${
                              form.newPassword.length > i * 2 + 2
                                ? form.newPassword.length >= 12 ? "bg-emerald-500"
                                  : form.newPassword.length >= 8 ? "bg-amber-500"
                                  : "bg-red-400"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {form.newPassword.length < 8 ? "Too short" : form.newPassword.length < 12 ? "Acceptable" : "Strong"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPw">Confirm new password</Label>
                  <Input
                    id="confirmPw"
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    placeholder="Repeat new password"
                  />
                  {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || !form.newPassword || !form.confirmPassword}
                  className="w-full"
                >
                  {loading ? "Updating…" : "Set new password"}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-border text-center">
            <Link href="/login">
              <button className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 mx-auto transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
