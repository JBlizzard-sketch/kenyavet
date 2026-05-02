import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatKsh, formatDate } from "@/lib/utils";
import { Shield, CheckCircle, Printer, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Receipt {
  requestId: number;
  workerName: string;
  workerRole: string;
  packageName: string;
  priceKsh: number;
  mpesaRef: string;
  employerName: string;
  employerEmail: string;
  paymentDate: string;
  status: string;
}

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Receipt>(`/vetting-requests/${id}/receipt`, { token })
      .then(setReceipt)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load receipt"))
      .finally(() => setLoading(false));
  }, [id, token]);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>KenyaVet Payment Receipt</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: white; color: #111; padding: 40px; }
          .header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
          .logo { width: 40px; height: 40px; background: #059669; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
          .logo-text { color: white; font-size: 18px; font-weight: bold; }
          .brand { font-size: 20px; font-weight: 700; color: #111; }
          .brand-sub { font-size: 11px; color: #6b7280; }
          h1 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 4px; }
          .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 28px; }
          .success-badge { display: inline-flex; align-items: center; gap: 8px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 24px; padding: 8px 16px; font-size: 13px; font-weight: 600; margin-bottom: 28px; }
          .amount-box { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 14px; padding: 20px 24px; margin-bottom: 28px; text-align: center; }
          .amount { font-size: 36px; font-weight: 800; color: #059669; }
          .amount-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .ref-box { background: #f9fafb; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
          .ref-label { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
          .ref-value { font-size: 18px; font-weight: 700; color: #111; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
          td { padding: 9px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
          td:first-child { color: #6b7280; width: 45%; }
          td:last-child { font-weight: 500; text-align: right; }
          .footer { text-align: center; font-size: 11px; color: #9ca3af; padding-top: 16px; border-top: 1px solid #f3f4f6; }
          @media print { body { padding: 24px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo"><span class="logo-text">K</span></div>
          <div><div class="brand">KenyaVet</div><div class="brand-sub">Background Vetting Services</div></div>
        </div>
        <h1>Payment Receipt</h1>
        <div class="subtitle">Official receipt for vetting service payment</div>
        <div class="success-badge">✓ Payment Confirmed</div>
        <div class="amount-box">
          <div class="amount">${formatKsh(receipt?.priceKsh ?? 0)}</div>
          <div class="amount-label">Amount Paid via M-Pesa</div>
        </div>
        <div class="ref-box">
          <div class="ref-label">M-Pesa Reference</div>
          <div class="ref-value">${receipt?.mpesaRef ?? "—"}</div>
        </div>
        <table>
          <tr><td>Worker</td><td>${receipt?.workerName}</td></tr>
          <tr><td>Role</td><td>${receipt?.workerRole}</td></tr>
          <tr><td>Vetting Package</td><td>${receipt?.packageName}</td></tr>
          <tr><td>Payment Date</td><td>${formatDate(receipt?.paymentDate ?? "")}</td></tr>
          <tr><td>Billed To</td><td>${receipt?.employerName}</td></tr>
          <tr><td>Email</td><td>${receipt?.employerEmail}</td></tr>
          <tr><td>Request ID</td><td>#${receipt?.requestId}</td></tr>
        </table>
        <div class="footer">
          KenyaVet — Trusted Domestic Staff Vetting · kenyavet.co.ke<br/>
          This is your official payment receipt. Please keep for your records.
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/vetting-requests/${id}`}>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-serif font-bold text-foreground">Payment Receipt</h1>
            <p className="text-sm text-muted-foreground">Official M-Pesa payment confirmation</p>
          </div>
        </div>

        {loading && (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading receipt…</div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {receipt && (
          <div ref={printRef}>
            <div className="bg-card rounded-2xl border border-card-border overflow-hidden shadow-sm">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">KenyaVet</p>
                      <p className="text-white/70 text-xs">Background Vetting Services</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-xs">Receipt</p>
                    <p className="text-white font-mono text-sm font-semibold">#{receipt.requestId}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Success indicator */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Payment Confirmed</p>
                    <p className="text-xs text-muted-foreground">{formatDate(receipt.paymentDate)}</p>
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5 text-center">
                  <p className="text-3xl font-black text-emerald-700">{formatKsh(receipt.priceKsh)}</p>
                  <p className="text-xs text-emerald-600 mt-1">Paid via M-Pesa</p>
                </div>

                {/* M-Pesa Reference */}
                <div className="bg-muted/50 rounded-xl p-4 mb-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">M-Pesa Reference</p>
                  <p className="text-xl font-bold font-mono text-foreground">{receipt.mpesaRef}</p>
                </div>

                {/* Details table */}
                <div className="space-y-3 text-sm mb-5">
                  {[
                    ["Worker", receipt.workerName],
                    ["Role", receipt.workerRole],
                    ["Vetting Package", receipt.packageName],
                    ["Payment Date", formatDate(receipt.paymentDate)],
                    ["Billed To", receipt.employerName],
                    ["Email", receipt.employerEmail],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-border pb-3 last:border-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-center text-muted-foreground mb-5">
                  This is your official payment receipt. Please keep for your records.
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button className="flex-1 gap-2" onClick={handlePrint}>
                    <Printer className="w-4 h-4" /> Print Receipt
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handlePrint}>
                    <Download className="w-4 h-4" /> Save PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
