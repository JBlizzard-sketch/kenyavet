import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? "KenyaVet";
const FROM_ADDR = process.env.EMAIL_FROM_ADDR ?? "noreply@kenyavet.co.ke";

function isConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

interface ScoreBreakdown {
  identity?: number | null;
  references?: number | null;
  dciCertificate?: number | null;
  socialMedia?: number | null;
  addressVisit?: number | null;
}

interface ReportEmailData {
  employerName: string;
  employerEmail: string;
  workerName: string;
  workerRole: string;
  trustScore: number;
  recommendation: string;
  reportId: number;
  requestId: number;
  scoreBreakdown?: ScoreBreakdown;
}

function scoreBar(score: number, max: number, color: string): string {
  const pct = Math.round((score / max) * 100);
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:3px 0;">
      <tr>
        <td width="100%" style="background:#f3f4f6;border-radius:4px;height:6px;overflow:hidden;">
          <table cellpadding="0" cellspacing="0" border="0" width="${pct}%" style="height:6px;">
            <tr><td style="background:${color};height:6px;border-radius:4px;"></td></tr>
          </table>
        </td>
      </tr>
    </table>`;
}

export async function sendReportReadyEmail(data: ReportEmailData): Promise<boolean> {
  const isHire = data.recommendation === "hire";
  const isCaution = data.recommendation === "caution";

  const recLabel = isHire ? "Safe to Hire" : isCaution ? "Proceed with Caution" : "Do Not Hire";
  const recBg = isHire ? "#dcfce7" : isCaution ? "#fef9c3" : "#fee2e2";
  const recColor = isHire ? "#166534" : isCaution ? "#854d0e" : "#991b1b";
  const scoreColor = data.trustScore >= 80 ? "#10b981" : data.trustScore >= 60 ? "#f59e0b" : "#ef4444";
  const appUrl = process.env.APP_URL ?? "https://kenyavet.co.ke";

  const bd = data.scoreBreakdown ?? {};
  const hasBd = Object.values(bd).some(v => v != null && v > 0);

  const breakdownRows = hasBd ? `
    <tr><td colspan="2" style="padding-top:16px;padding-bottom:8px;">
      <p style="font-size:12px;font-weight:600;color:#374151;margin:0;text-transform:uppercase;letter-spacing:.05em;">Score Breakdown</p>
    </td></tr>
    ${bd.identity != null ? `
    <tr>
      <td style="font-size:12px;color:#6b7280;padding:4px 0;width:160px;">Identity Verification</td>
      <td style="font-size:12px;font-weight:600;color:#111827;text-align:right;">${bd.identity}/25</td>
    </tr>
    <tr><td colspan="2">${scoreBar(bd.identity, 25, "#6366f1")}</td></tr>` : ""}
    ${bd.references != null ? `
    <tr>
      <td style="font-size:12px;color:#6b7280;padding:4px 0;">Reference Calls</td>
      <td style="font-size:12px;font-weight:600;color:#111827;text-align:right;">${bd.references}/30</td>
    </tr>
    <tr><td colspan="2">${scoreBar(bd.references, 30, "#0ea5e9")}</td></tr>` : ""}
    ${bd.dciCertificate != null ? `
    <tr>
      <td style="font-size:12px;color:#6b7280;padding:4px 0;">DCI Certificate</td>
      <td style="font-size:12px;font-weight:600;color:#111827;text-align:right;">${bd.dciCertificate}/20</td>
    </tr>
    <tr><td colspan="2">${scoreBar(bd.dciCertificate, 20, "#8b5cf6")}</td></tr>` : ""}
    ${bd.socialMedia != null ? `
    <tr>
      <td style="font-size:12px;color:#6b7280;padding:4px 0;">Social Media Review</td>
      <td style="font-size:12px;font-weight:600;color:#111827;text-align:right;">${bd.socialMedia}/15</td>
    </tr>
    <tr><td colspan="2">${scoreBar(bd.socialMedia, 15, "#f59e0b")}</td></tr>` : ""}
    ${bd.addressVisit != null ? `
    <tr>
      <td style="font-size:12px;color:#6b7280;padding:4px 0;">Address Visit</td>
      <td style="font-size:12px;font-weight:600;color:#111827;text-align:right;">${bd.addressVisit}/10</td>
    </tr>
    <tr><td colspan="2">${scoreBar(bd.addressVisit, 10, "#10b981")}</td></tr>` : ""}
  ` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Vetting Report is Ready</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;padding:32px 16px;margin:0;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;margin:0 auto;">
    <tr><td>

      <!-- Header -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f4c3a;border-radius:12px 12px 0 0;">
        <tr>
          <td style="padding:24px 32px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:36px;height:36px;background:#10b981;border-radius:9px;text-align:center;vertical-align:middle;">
                  <span style="color:#fff;font-size:18px;font-weight:700;line-height:36px;">✓</span>
                </td>
                <td style="padding-left:10px;">
                  <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">KenyaVet</span>
                </td>
              </tr>
            </table>
            <p style="color:#a7f3d0;font-size:13px;margin:12px 0 0;">Professional Domestic Staff Verification · Nairobi</p>
          </td>
        </tr>
      </table>

      <!-- Body -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <tr>
          <td style="padding:32px;">

            <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 6px;letter-spacing:-0.02em;">Vetting Report Ready</h1>
            <p style="color:#6b7280;font-size:14px;margin:0 0 28px;">Hi <strong style="color:#374151;">${data.employerName}</strong>, the background check for <strong style="color:#374151;">${data.workerName}</strong> is complete.</p>

            <!-- Score card -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:24px;">
              <tr>
                <td style="padding:24px;text-align:center;">
                  <div style="font-size:56px;font-weight:900;color:${scoreColor};line-height:1;letter-spacing:-0.03em;">${data.trustScore}</div>
                  <div style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-top:4px;">Trust Score out of 100</div>
                  <!-- Score bar -->
                  <table cellpadding="0" cellspacing="0" border="0" width="80%" style="margin:14px auto 16px;">
                    <tr>
                      <td style="background:#e5e7eb;border-radius:6px;height:8px;overflow:hidden;">
                        <table cellpadding="0" cellspacing="0" border="0" width="${data.trustScore}%" style="height:8px;">
                          <tr><td style="background:${scoreColor};height:8px;border-radius:6px;"></td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <span style="display:inline-block;background:${recBg};color:${recColor};font-size:13px;font-weight:700;padding:6px 16px;border-radius:999px;letter-spacing:.01em;">${recLabel}</span>
                </td>
              </tr>
            </table>

            <!-- Worker details + score breakdown -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;margin-bottom:28px;">
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="color:#9ca3af;padding:7px 0;">Worker</td>
                <td style="font-weight:600;color:#111827;text-align:right;">${data.workerName}</td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="color:#9ca3af;padding:7px 0;">Role</td>
                <td style="color:#374151;text-align:right;">${data.workerRole}</td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="color:#9ca3af;padding:7px 0;">Report ID</td>
                <td style="color:#374151;text-align:right;font-family:monospace;">#${data.reportId}</td>
              </tr>
              ${breakdownRows}
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="border-radius:10px;background:#0f4c3a;" align="center">
                  <a href="${appUrl}/reports?requestId=${data.requestId}"
                     style="display:block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;letter-spacing:.01em;">
                    View Full Report →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;text-align:center;">
              You can also verify this worker's certificate at
              <a href="${appUrl}/verify" style="color:#0f4c3a;text-decoration:none;">${appUrl.replace("https://", "")}/verify</a>
              using report ID <strong>#${data.reportId}</strong>.
            </p>

          </td>
        </tr>
      </table>

      <!-- Footer -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
        <tr>
          <td style="padding:16px 32px;text-align:center;">
            <p style="font-size:11px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} KenyaVet · Nairobi, Kenya · <a href="${appUrl}" style="color:#9ca3af;text-decoration:none;">kenyavet.co.ke</a></p>
          </td>
        </tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;

  if (!isConfigured()) {
    console.log(`[EMAIL] SMTP not configured — would have sent report-ready email to ${data.employerEmail}:`, {
      subject: `Vetting Report Ready — ${data.workerName} (Score: ${data.trustScore}/100)`,
    });
    return false;
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDR}>`,
      to: data.employerEmail,
      subject: `Vetting Report Ready — ${data.workerName} (Score: ${data.trustScore}/100)`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[EMAIL] Failed to send:", err);
    return false;
  }
}
