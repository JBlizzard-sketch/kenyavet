import { useState } from "react";
import { Link } from "wouter";
import { Shield, Mail, ArrowLeft, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResetUrl(data.resetUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!resetUrl) return;
    navigator.clipboard.writeText(resetUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">KenyaVet</h1>
          <p className="text-muted-foreground text-sm mt-1">Reset your password</p>
        </div>

        <div className="bg-card rounded-2xl border border-card-border shadow-sm p-8">
          {!resetUrl ? (
            <>
              <h2 className="font-semibold text-foreground text-lg mb-1">Forgot your password?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter the email address for your account and we'll send you a reset link.
              </p>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email address</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="font-semibold text-foreground text-lg mb-2">Reset link generated</h2>
              <p className="text-sm text-muted-foreground mb-6">
                In production this would be emailed to <strong>{email}</strong>. For this demo, use the link below directly.
              </p>

              <div className="bg-muted/60 rounded-lg p-3 text-left mb-4 group relative overflow-hidden">
                <p className="text-xs font-mono text-foreground break-all leading-relaxed">{resetUrl}</p>
              </div>

              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy link"}
                </Button>
                <a href={resetUrl}>
                  <Button size="sm" className="gap-2">
                    <ExternalLink className="w-3.5 h-3.5" /> Open reset page
                  </Button>
                </a>
              </div>
            </div>
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
