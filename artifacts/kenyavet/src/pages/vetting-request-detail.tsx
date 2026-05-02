import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatDate, formatKsh, getStatusColor, getStatusLabel, getTrustScoreBg, getTrustScoreLabel } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle, FileText, Shield, Smartphone, X, Loader2, Phone, UserCheck, Trash2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  requestId: number;
  userId: number;
  role: string;
  senderName: string;
  body: string;
  createdAt: string;
}

interface VettingStep {
  id: number;
  stepName: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
}

interface ReferenceContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
  employerName: string;
  yearsWorked: number | null;
  callStatus: string;
  callSummary: string | null;
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
  reportId: number | null;
  packageName: string;
  priceKsh: number;
  turnaroundHours: number;
  createdAt: string;
  updatedAt: string;
  steps: VettingStep[];
  references: ReferenceContact[];
  stepProgress: { completed: number; total: number } | null;
}

type PaymentStage = "idle" | "entering" | "processing" | "success" | "error";

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

function MpesaModal({
  request,
  userPhone,
  onClose,
  onSuccess,
}: {
  request: RequestDetail;
  userPhone: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [phone, setPhone] = useState(userPhone ?? "");
  const [stage, setStage] = useState<PaymentStage>("entering");
  const [countdown, setCountdown] = useState(5);
  const [mpesaRef, setMpesaRef] = useState("");
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handlePay() {
    if (!phone.trim()) { setError("Please enter your M-Pesa phone number."); return; }
    setError("");
    setStage("processing");
    setCountdown(5);

    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    await new Promise(r => setTimeout(r, 5000));

    try {
      const result = await apiFetch<{ success: boolean; mpesaRef: string }>(`/vetting-requests/${request.id}/pay`, {
        method: "POST",
        token,
        body: { phone },
      });
      if (result.success) {
        setMpesaRef(result.mpesaRef);
        setStage("success");
        setTimeout(() => { onSuccess(); }, 2500);
      } else {
        setStage("error");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setError(msg);
      setStage("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Pay via M-Pesa</p>
              <p className="text-xs text-muted-foreground">Lipa na M-Pesa</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {stage === "entering" && (
            <>
              <div className="bg-muted/50 rounded-xl p-4 mb-5 text-sm">
                <div className="flex justify-between mb-1.5">
                  <span className="text-muted-foreground">Worker</span>
                  <span className="font-medium">{request.workerName}</span>
                </div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium">{request.packageName}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground font-medium">Total</span>
                  <span className="font-bold text-foreground text-base">{formatKsh(request.priceKsh)}</span>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-foreground mb-2">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setError(""); }}
                  placeholder="e.g. 0712 345 678"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {error && <p className="text-red-600 text-xs mt-1.5">{error}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  An STK push will be sent to this number. Enter your M-Pesa PIN when prompted.
                </p>
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handlePay}>
                Send STK Push — {formatKsh(request.priceKsh)}
              </Button>
            </>
          )}

          {stage === "processing" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                {countdown > 0 ? (
                  <span className="text-2xl font-bold text-emerald-600">{countdown}</span>
                ) : (
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                )}
              </div>
              <p className="font-semibold text-foreground mb-1.5">STK Push Sent</p>
              <p className="text-sm text-muted-foreground">
                Check your phone <span className="font-mono font-semibold">{phone}</span> and enter your M-Pesa PIN.
              </p>
              <p className="text-xs text-muted-foreground mt-3">Confirming payment…</p>
            </div>
          )}

          {stage === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9 text-emerald-600" />
              </div>
              <p className="font-semibold text-foreground text-lg mb-1">Payment Confirmed!</p>
              <p className="text-sm text-muted-foreground mb-3">
                {formatKsh(request.priceKsh)} received. Vetting begins within 2 hours.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 inline-block">
                <p className="text-xs text-emerald-700 font-mono">Ref: {mpesaRef}</p>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="font-semibold text-foreground mb-1.5">Payment Failed</p>
              <p className="text-sm text-muted-foreground mb-4">{error || "Please try again."}</p>
              <Button variant="outline" onClick={() => { setStage("entering"); setError(""); }}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VettingRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const [, navigate] = useLocation();
  const [req, setReq] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const msgBottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    if (!id) return;
    try {
      const data = await apiFetch<{ messages: Message[] }>(`/vetting-requests/${id}/messages`, { token });
      setMessages(data.messages);
    } catch { /* silently ignore */ }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!msgInput.trim() || msgSending) return;
    setMsgSending(true);
    try {
      const msg = await apiFetch<Message>(`/vetting-requests/${id}/messages`, {
        method: "POST", token,
        body: { body: msgInput.trim() },
      });
      setMessages(prev => [...prev, msg]);
      setMsgInput("");
      setTimeout(() => msgBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setMsgSending(false);
    }
  }

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

  useEffect(() => { load(); loadMessages(); }, [id, token]);

  function handlePaymentSuccess() {
    setShowPayment(false);
    load();
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await apiFetch(`/vetting-requests/${id}/cancel`, { method: "POST", token, body: {} });
      toast({ title: "Request cancelled", description: "Your vetting request has been cancelled." });
      load();
    } catch (e: unknown) {
      toast({ title: "Failed to cancel", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  if (loading) {
    return <AppLayout><div className="p-6 text-muted-foreground text-sm">Loading…</div></AppLayout>;
  }

  if (!req) return null;

  return (
    <AppLayout>
      {showPayment && (
        <MpesaModal
          request={req}
          userPhone={user?.phone ?? null}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

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
            {/* Payment banner */}
            {req.status === "pending_payment" && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 mb-0.5">Payment Required to Begin Vetting</p>
                    <p className="text-sm text-amber-700">
                      Pay <span className="font-bold">{formatKsh(req.priceKsh)}</span> via M-Pesa to start background verification for {req.workerName}.
                    </p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        onClick={() => setShowPayment(true)}
                      >
                        <Smartphone className="w-4 h-4" />
                        Pay with M-Pesa — {formatKsh(req.priceKsh)}
                      </Button>
                      {!confirmCancel ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground gap-1.5 hover:text-red-600"
                          onClick={() => setConfirmCancel(true)}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Cancel Request
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-700 font-medium">Cancel this request?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-3 text-xs gap-1"
                            onClick={handleCancel}
                            disabled={cancelling}
                          >
                            {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Yes, cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-3 text-xs"
                            onClick={() => setConfirmCancel(false)}
                          >
                            Keep
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            {/* Reference contacts (read-only for employer) */}
            {req.references && req.references.length > 0 && (
              <div className="bg-card rounded-xl border border-card-border p-5">
                <h2 className="font-semibold text-foreground mb-1 text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Reference Contacts
                </h2>
                <p className="text-xs text-muted-foreground mb-4">Our ops team will contact these references during verification</p>
                <div className="space-y-3">
                  {req.references.map((ref, i) => (
                    <div key={ref.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{ref.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            ref.callStatus === "completed" ? "bg-emerald-100 text-emerald-700" :
                            ref.callStatus === "no_answer" || ref.callStatus === "busy" ? "bg-amber-100 text-amber-700" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {ref.callStatus === "pending" ? "Awaiting call" :
                             ref.callStatus === "completed" ? "Called" :
                             ref.callStatus.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{ref.relationship} · {ref.employerName}</p>
                        {ref.callSummary && (
                          <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1">{ref.callSummary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{ref.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vetting steps */}
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h2 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                Verification Steps
                {req.stepProgress && (
                  <span className="text-xs font-normal text-muted-foreground normal-case tracking-normal">
                    {req.stepProgress.completed}/{req.stepProgress.total} complete
                  </span>
                )}
              </h2>
              {req.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Steps will appear once vetting begins.</p>
              ) : (
                <ol className="space-y-3">
                  {req.steps.map((step) => {
                    const Icon = stepIcons[step.status] ?? AlertCircle;
                    return (
                      <li key={step.id} className="flex items-start gap-3">
                        <div className={`mt-0.5 ${stepColors[step.status] ?? "text-muted-foreground"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">{step.stepName}</p>
                            {step.completedAt && <span className="text-xs text-muted-foreground">{formatDate(step.completedAt)}</span>}
                          </div>
                          {step.notes && <p className="text-xs text-muted-foreground mt-0.5">{step.notes}</p>}
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">{step.status.replace("_", " ")}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
            {/* Message thread */}
            {req.status !== "pending_payment" && (
              <div className="bg-card rounded-xl border border-card-border">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Messages</h2>
                  {messages.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {/* Thread */}
                <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center py-6">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No messages yet. Ask the KenyaVet team a question or provide additional details.</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isOwn = msg.userId === user?.id;
                      const isOps = msg.role === "ops" || msg.role === "admin";
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            <div className="flex items-center gap-1.5">
                              {!isOwn && (
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${isOps ? "bg-primary" : "bg-emerald-500"}`}>
                                  {msg.senderName.charAt(0)}
                                </div>
                              )}
                              <span className="text-[11px] text-muted-foreground">
                                {isOwn ? "You" : msg.senderName}
                                {isOps && !isOwn && <span className="ml-1 px-1 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">KenyaVet</span>}
                              </span>
                            </div>
                            <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : isOps
                                ? "bg-blue-50 text-blue-900 border border-blue-100 rounded-tl-sm"
                                : "bg-muted text-foreground rounded-tl-sm"
                            }`}>
                              {msg.body}
                            </div>
                            <span className="text-[10px] text-muted-foreground px-1">
                              {new Date(msg.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                              {" · "}
                              {new Date(msg.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={msgBottomRef} />
                </div>

                {/* Compose */}
                <div className="px-5 pb-4 pt-2 border-t border-border">
                  <form onSubmit={sendMessage} className="flex gap-2 items-end">
                    <textarea
                      value={msgInput}
                      onChange={e => setMsgInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as React.FormEvent); } }}
                      placeholder="Type a message… (Enter to send)"
                      rows={2}
                      className="flex-1 text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!msgInput.trim() || msgSending}
                      className="gap-1.5 shrink-0 h-[58px] px-4"
                    >
                      {msgSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                </div>
              </div>
            )}
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

            {req.status === "completed" && req.reportId && (
              <Link href={`/reports/${req.reportId}`}>
                <Button className="w-full gap-2" variant="outline">
                  <FileText className="w-4 h-4" />
                  View Full Report
                </Button>
              </Link>
            )}

            {req.status === "completed" && !req.reportId && (
              <Link href={`/reports?requestId=${req.id}`}>
                <Button className="w-full gap-2" variant="outline">
                  <FileText className="w-4 h-4" />
                  View Report
                </Button>
              </Link>
            )}

            {(req.status === "completed" || req.status === "cancelled") && (
              <Link href={`/vetting-requests/new?workerName=${encodeURIComponent(req.workerName)}&workerRole=${encodeURIComponent(req.workerRole)}&workerIdNumber=${encodeURIComponent(req.workerIdNumber)}&workerPhone=${encodeURIComponent(req.workerPhone ?? "")}`}>
                <Button className="w-full gap-2" variant="outline">
                  <UserCheck className="w-4 h-4" />
                  Re-submit Same Worker
                </Button>
              </Link>
            )}

            {req.status !== "pending_payment" && (
              <Link href={`/receipt/${req.id}`}>
                <Button className="w-full gap-2" variant="ghost">
                  <Shield className="w-4 h-4" />
                  Payment Receipt
                </Button>
              </Link>
            )}

            {req.status !== "pending_payment" && req.status !== "completed" && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <p className="font-medium text-blue-900">Vetting in Progress</p>
                </div>
                <p className="text-blue-700 text-xs">
                  Our team is conducting the background checks. Expected completion: within {req.turnaroundHours} hours of payment.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
