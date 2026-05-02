import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Shield, Printer, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrustScoreLabel, getTrustScoreBg } from "@/lib/utils";

interface QrCardProps {
  reportId: number;
  workerName: string;
  workerRole: string;
  trustScore: number;
  packageName?: string;
  generatedDate: string;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
}

export default function QrCard({ reportId, workerName, workerRole, trustScore, packageName, generatedDate, onClose }: QrCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const verifyUrl = `${base}/verify?reportId=${reportId}`;

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#0f4c3a", light: "#ffffff" },
    }).then(setQrDataUrl).catch(console.error);
  }, [verifyUrl]);

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>KenyaVet QR Card — ${workerName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { width: 85mm; border: 2px solid #0f4c3a; border-radius: 8px; overflow: hidden; }
    .header { background: #0f4c3a; color: white; padding: 12px 16px; display: flex; align-items: center; gap: 8px; }
    .logo { font-size: 16px; font-weight: bold; }
    .subtitle { font-size: 9px; opacity: .7; font-family: sans-serif; }
    .body { padding: 16px; display: flex; gap: 14px; align-items: flex-start; }
    .qr img { width: 80px; height: 80px; }
    .info { flex: 1; }
    .name { font-size: 15px; font-weight: bold; color: #111; }
    .role { font-size: 11px; color: #555; margin-top: 2px; font-family: sans-serif; }
    .score-row { margin-top: 8px; display: flex; align-items: center; gap: 6px; }
    .score { font-size: 22px; font-weight: 900; color: ${trustScore >= 80 ? "#10b981" : trustScore >= 60 ? "#f59e0b" : "#ef4444"}; }
    .score-label { font-size: 9px; color: #888; font-family: sans-serif; }
    .check { font-size: 9px; color: #10b981; font-family: sans-serif; margin-top: 6px; }
    .footer { background: #f9fafb; padding: 8px 16px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #9ca3af; font-family: sans-serif; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span>✓</span>
      <div>
        <div class="logo">KenyaVet</div>
        <div class="subtitle">Verified Domestic Worker</div>
      </div>
    </div>
    <div class="body">
      <div class="qr"><img src="${qrDataUrl}" /></div>
      <div class="info">
        <div class="name">${workerName}</div>
        <div class="role">${workerRole}</div>
        <div class="score-row">
          <div class="score">${trustScore}</div>
          <div class="score-label">Trust<br/>Score</div>
        </div>
        <div class="check">✓ Identity Verified &nbsp; ✓ DCI Checked</div>
        <div class="check">✓ References Verified</div>
      </div>
    </div>
    <div class="footer">
      <span>Report #${reportId} · ${formatDate(generatedDate)}</span>
      <span>kenyavet.co.ke</span>
    </div>
  </div>
  <script>setTimeout(() => { window.print(); window.close(); }, 300);</script>
</body>
</html>`);
    win.document.close();
  }

  const scoreRingColor = trustScore >= 80 ? "#10b981" : trustScore >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">QR Verification Card</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card preview */}
        <div className="p-5">
          <div className="border-2 border-[#0f4c3a] rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="bg-[#0f4c3a] px-4 py-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">KenyaVet</p>
                <p className="text-white/60 text-[10px] mt-0.5">Verified Domestic Worker</p>
              </div>
            </div>

            {/* Card body */}
            <div className="p-4 flex gap-4 items-start">
              {/* QR code */}
              <div className="shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-20 h-20 rounded-lg" />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg animate-pulse" />
                )}
              </div>

              {/* Worker info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-snug">{workerName}</p>
                <p className="text-xs text-gray-500">{workerRole}</p>
                {packageName && <p className="text-[10px] text-gray-400 mt-0.5">{packageName}</p>}

                <div className="flex items-end gap-1.5 mt-2">
                  <span className="text-3xl font-black leading-none" style={{ color: scoreRingColor }}>{trustScore}</span>
                  <div className="pb-0.5">
                    <p className="text-[9px] text-gray-400 leading-none">TRUST</p>
                    <p className="text-[9px] text-gray-400 leading-none">SCORE</p>
                  </div>
                </div>

                <div className="mt-2 space-y-0.5">
                  <p className="text-[9px] text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" /> Identity & DCI Verified
                  </p>
                  <p className="text-[9px] text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" /> References Checked
                  </p>
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-t border-gray-100">
              <p className="text-[9px] text-gray-400">Report #{reportId} · {formatDate(generatedDate)}</p>
              <p className="text-[9px] text-gray-400">kenyavet.co.ke</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">Scan QR code to verify this worker online</p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <Button onClick={handlePrint} className="flex-1 gap-2" disabled={!qrDataUrl}>
            <Printer className="w-4 h-4" /> Print Card
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
