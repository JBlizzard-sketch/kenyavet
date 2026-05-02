import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg, getTrustScoreLabel } from "@/lib/utils";
import { ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VettingStep {
  id: number;
  stepName: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
}

interface RequestDetail {
  id: number;
  workerName: string;
  workerRole: string;
  workerIdNumber: string;
  workerPhone: string | null;
  workerEmail: string | null;
  notes: string | null;
  status: string;
  trustScore: number | null;
  packageName: string;
  priceKsh: number;
  turnaroundHours: number;
  createdAt: string;
  updatedAt: string;
  steps: VettingStep[];
}

const stepIcons: Record<string, React.ElementType> = {
  completed: CheckCircle,
  in_progress: Clock,
  failed: XCircle,
  pending: AlertCircle,
};

const stepColors: Record<string, string> = {
  completed: "text-emerald-600",
  in_progress: "text-blue-600",
  failed: "text-red-600",
  pending: "text-muted-foreground",
};

export default function VettingRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, isOps } = useAuth();
  const [, navigate] = useLocation();
  const [req, setReq] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await apiFetch<RequestDetail>(`/vetting-requests/${id}`, { token });
      setReq(data);
    } catch {
      navigate("/vetting-requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id, token]);

  if (loading) {
    return <AppLayout><div className="p-6 text-muted-foreground text-sm">Loading…</div></AppLayout>;
  }

  if (!req) return null;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate("/vetting-requests")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">{req.workerName}</h1>
            <p className="text-muted-foreground text-sm">{req.workerRole} · Request #{req.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {req.trustScore != null && (
              <div className={`text-sm font-bold px-3 py-1.5 rounded-full ${getTrustScoreBg(req.trustScore)}`}>
                {req.trustScore}/100 · {getTrustScoreLabel(req.trustScore)}
              </div>
            )}
            <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${getStatusColor(req.status)}`}>
              {getStatusLabel(req.status)}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Worker info card */}
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h2 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide text-muted-foreground">Worker Information</h2>
              <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div><span className="text-muted-foreground">Full Name</span><p className="font-medium mt-0.5">{req.workerName}</p></div>
                <div><span className="text-muted-foreground">Role</span><p className="font-medium mt-0.5">{req.workerRole}</p></div>
                <div><span className="text-muted-foreground">National ID</span><p className="font-medium mt-0.5">{req.workerIdNumber}</p></div>
                {req.workerPhone && <div><span className="text-muted-foreground">Phone</span><p className="font-medium mt-0.5">{req.workerPhone}</p></div>}
                {req.workerEmail && <div><span className="text-muted-foreground">Email</span><p className="font-medium mt-0.5">{req.workerEmail}</p></div>}
                {req.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">Notes</span><p className="mt-0.5 text-foreground">{req.notes}</p></div>}
              </div>
            </div>

            {/* Vetting steps */}
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h2 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide text-muted-foreground">Verification Steps</h2>
              {req.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Steps will appear once vetting begins.</p>
              ) : (
                <div className="space-y-3">
                  {req.steps.map((step, idx) => {
                    const Icon = stepIcons[step.status] ?? AlertCircle;
                    return (
                      <div key={step.id} className="flex items-start gap-3">
                        <div className={`mt-0.5 ${stepColors[step.status] ?? "text-muted-foreground"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">{step.stepName}</p>
                            {step.completedAt && <span className="text-xs text-muted-foreground">{formatDate(step.completedAt)}</span>}
                          </div>
                          {step.notes && <p className="text-xs text-muted-foreground mt-0.5">{step.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h3 className="font-semibold text-foreground mb-4 text-sm">Package Details</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium">{req.packageName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{formatKsh(req.priceKsh)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Turnaround</span>
                  <span>{req.turnaroundHours}h</span>
                </div>
                <div className="border-t border-border pt-2.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{formatDate(req.createdAt)}</span>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{formatDate(req.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {req.status === "completed" && (
              <Link href={`/reports?requestId=${req.id}`}>
                <Button className="w-full gap-2" variant="outline">
                  <FileText className="w-4 h-4" />
                  View Full Report
                </Button>
              </Link>
            )}

            {req.status === "pending_payment" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <p className="font-medium text-amber-800 mb-1">Payment Required</p>
                <p className="text-amber-700 text-xs">M-Pesa to: <span className="font-mono font-semibold">0712 345 678</span></p>
                <p className="text-amber-700 text-xs mt-1">Reference: <span className="font-mono font-semibold">KV-{req.id}</span></p>
                <p className="text-amber-700 text-xs mt-1">Amount: <span className="font-semibold">{formatKsh(req.priceKsh)}</span></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
