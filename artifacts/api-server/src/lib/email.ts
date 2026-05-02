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

interface ReportEmailData {
  employerName: string;
  employerEmail: string;
  workerName: string;
  workerRole: string;
  trustScore: number;
  recommendation: string;
  reportId: number;
  requestId: number;
}

export async function sendReportReadyEmail(data: ReportEmailData): Promise<boolean> {
  const recLabel = data.recommendation === "hire"
    ? "Safe to Hire"
    : data.recommendation === "caution"
    ? "Proceed with Caution"
    : "Do Not Hire";

  const scoreColor = data.trustScore >= 80 ? "#10b981" : data.trustScore >= 60 ? "#f59e0b" : "#ef4444";
  const appUrl = process.env.APP_URL ?? "https://kenyavet.co.ke";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Vetting Report is Ready</title></head>
<body style="font-family:sans-serif;background:#f9fafb;padding:32px 0;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#0f4c3a;padding:24px 32px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:#10b981;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-size:16px;">✓</span>
        </div>
        <span style="color:#fff;font-size:18px;font-weight:700;">KenyaVet</span>
      </div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:22px;color:#111827;margin:0 0 8px;">Vetting Report Ready</h1>
      <p style="color:#6b7280;margin:0 0 24px;">Hi ${data.employerName}, the background check for <strong>${data.workerName}</strong> is complete.</p>

      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
        <div style="font-size:48px;font-weight:900;color:${scoreColor};line-height:1;">${data.trustScore}</div>
        <div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin-top:4px;">Trust Score / 100</div>
        <div style="margin-top:12px;font-size:14px;font-weight:600;color:#111827;">${recLabel}</div>
      </div>

      <table style="width:100%;font-size:14px;margin-bottom:24px;">
        <tr><td style="color:#6b7280;padding:6px 0;">Worker</td><td style="font-weight:600;text-align:right;">${data.workerName}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 0;">Role</td><td style="text-align:right;">${data.workerRole}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 0;">Report ID</td><td style="text-align:right;">#${data.reportId}</td></tr>
      </table>

      <a href="${appUrl}/reports?requestId=${data.requestId}"
         style="display:block;background:#0f4c3a;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">
        View Full Report
      </a>
    </div>

    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">KenyaVet · Professional Domestic Staff Verification · Nairobi</p>
    </div>
  </div>
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
