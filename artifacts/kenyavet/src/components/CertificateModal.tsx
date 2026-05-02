import { useEffect } from "react";
import { Shield, CheckCircle, X, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrustScoreLabel } from "@/lib/utils";

interface CertificateModalProps {
  workerName: string;
  workerRole: string;
  trustScore: number;
  badges: string[];
  reportId: number;
  packageName: string;
  reportDate: string;
  verifyUrl?: string;
  onClose: () => void;
}

function CertRing({ score }: { score: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#d1fae5" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{score}</span>
        <span className="text-[10px] text-gray-400 font-medium">/100</span>
      </div>
    </div>
  );
}

function whatsappUrl(workerName: string, workerRole: string, score: number, verifyUrl: string) {
  const label = getTrustScoreLabel(score);
  const rec = score >= 80 ? "✅ Safe to Hire" : score >= 60 ? "⚠️ Hire with Caution" : "❌ Do Not Hire";
  const text = `*KenyaVet Background Check*\n\n*${workerName}* — ${workerRole}\nTrust Score: *${score}/100* (${label})\nVerdict: ${rec}\n\nVerify independently: ${verifyUrl}\n\n_Verified by KenyaVet · Kenya's trusted domestic staff vetting platform_`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function CertificateModal({
  workerName, workerRole, trustScore, badges, reportId,
  packageName, reportDate, verifyUrl, onClose,
}: CertificateModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const certNo = `KVC-${new Date(reportDate).getFullYear()}-${String(reportId).padStart(5, "0")}`;
  const validUntil = new Date(reportDate);
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  const validStr = validUntil.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  const issuedStr = new Date(reportDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  const recLabel = trustScore >= 80 ? "Safe to Hire" : trustScore >= 60 ? "Hire with Caution" : "Do Not Hire";
  const recColor = trustScore >= 80 ? "#065f46" : trustScore >= 60 ? "#92400e" : "#991b1b";
  const recBg = trustScore >= 80 ? "#d1fae5" : trustScore >= 60 ? "#fef3c7" : "#fee2e2";

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @media print {
          body > *:not(.certificate-print-root) { display: none !important; }
          .certificate-print-root { position: fixed !important; inset: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; background: white !important; }
          .cert-no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="certificate-print-root w-full max-w-2xl">
        {/* Certificate document */}
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-emerald-700 print:rounded-none print:shadow-none print:border-4">
          {/* Corner ornaments */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-emerald-300 rounded-tl-lg" />
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-emerald-300 rounded-tr-lg" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-emerald-300 rounded-bl-lg" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-emerald-300 rounded-br-lg" />

          {/* Header band */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-700 px-8 py-5 text-center text-white">
            <div className="flex items-center justify-center gap-3 mb-1">
              <Shield className="w-7 h-7" />
              <span className="text-2xl font-bold tracking-wide">KenyaVet</span>
              <Shield className="w-7 h-7" />
            </div>
            <p className="text-emerald-100 text-xs tracking-[0.25em] uppercase font-medium">
              Domestic Staff Verification Services
            </p>
          </div>

          {/* Certificate title */}
          <div className="text-center pt-6 pb-2 px-8">
            <p className="text-xs text-gray-400 uppercase tracking-[0.3em] font-semibold mb-1">Official</p>
            <h1 className="text-2xl font-serif font-bold text-emerald-800 leading-tight">
              Certificate of Good Standing
            </h1>
            <div className="w-24 h-0.5 bg-emerald-600 mx-auto mt-3" />
          </div>

          {/* Body */}
          <div className="px-10 py-5 text-center space-y-4">
            <p className="text-gray-500 text-sm italic">This certifies that</p>
            <div>
              <h2 className="text-3xl font-serif font-bold text-gray-900 leading-tight">{workerName}</h2>
              <p className="text-gray-500 text-sm mt-1">{workerRole} · {packageName}</p>
            </div>

            <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
              has successfully completed a comprehensive background verification conducted by
              KenyaVet Verification Services and meets the standards for domestic employment.
            </p>

            {/* Trust score ring */}
            <div className="py-2">
              <CertRing score={trustScore} />
              <p
                className="text-sm font-bold mt-1 px-4 py-1 rounded-full inline-block"
                style={{ backgroundColor: recBg, color: recColor }}
              >
                {recLabel} · {getTrustScoreLabel(trustScore)}
              </p>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {badges.map(b => (
                  <span key={b} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-medium">
                    <CheckCircle className="w-3 h-3" /> {b}
                  </span>
                ))}
              </div>
            )}

            {/* Details row */}
            <div className="grid grid-cols-3 gap-4 border-t border-b border-gray-100 py-4 mt-2">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Certificate No.</p>
                <p className="text-xs font-mono text-gray-700 font-bold">{certNo}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Issued On</p>
                <p className="text-xs text-gray-700 font-medium">{issuedStr}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Valid Until</p>
                <p className="text-xs text-gray-700 font-medium">{validStr}</p>
              </div>
            </div>

            {/* Verify URL */}
            {verifyUrl && (
              <p className="text-[10px] text-gray-400">
                Verify at: <span className="font-mono text-gray-600">{verifyUrl}</span>
              </p>
            )}

            {/* Footer seal */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-left">
                <p className="text-[10px] text-gray-400">Authorised by</p>
                <p className="text-xs font-semibold text-gray-700 font-serif italic">KenyaVet Operations</p>
                <div className="w-20 border-t border-gray-300 mt-1" />
              </div>
              <div className="w-14 h-14 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                <div className="text-center">
                  <Shield className="w-5 h-5 text-emerald-700 mx-auto" />
                  <p className="text-[7px] text-emerald-700 font-bold leading-none mt-0.5">VERIFIED</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">This document is</p>
                <p className="text-xs font-semibold text-gray-700 font-serif italic">Officially Issued</p>
                <div className="w-20 border-t border-gray-300 mt-1 ml-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons — hidden on print */}
        <div className="cert-no-print flex items-center gap-3 mt-4 justify-center flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-white/90 text-gray-700 border-white/50 hover:bg-white"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" /> Print Certificate
          </Button>
          {verifyUrl && (
            <a
              href={whatsappUrl(workerName, workerRole, trustScore, verifyUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="sm"
                className="gap-2"
                style={{ backgroundColor: "#25D366", borderColor: "#25D366", color: "white" }}
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
              </Button>
            </a>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-white/80 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      </div>
    </div>
  );
}
