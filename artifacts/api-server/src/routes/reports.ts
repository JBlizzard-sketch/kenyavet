import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import PDFDocument from "pdfkit";
import { db, reportsTable, vettingRequestsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth-middleware";

interface ShareEntry {
  reportId: number;
  sharedBy: string;
  expiresAt: Date;
}

const shareTokens = new Map<string, ShareEntry>();

const router: IRouter = Router();

// PUBLIC — used by QR card scan links, no auth required
router.get("/reports/verify/:reportId", async (req, res): Promise<void> => {
  const reportId = parseInt(req.params.reportId as string, 10);
  if (isNaN(reportId)) { res.status(400).json({ message: "Invalid report ID" }); return; }

  const [row] = await db
    .select({ r: reportsTable, vr: vettingRequestsTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .where(eq(reportsTable.id, reportId));

  if (!row) { res.status(404).json({ message: "Report not found" }); return; }

  const { r, vr } = row;
  const breakdown = r.scoreBreakdown as Record<string, number | null> | null;

  const badges: string[] = [];
  if (r.identityVerified) badges.push("Identity Verified");
  if (r.dciCertificateStatus === "verified") badges.push("DCI Cleared");
  if (breakdown?.references != null && (breakdown.references ?? 0) >= 70) badges.push("References Checked");
  if (r.addressVerified) badges.push("Address Verified");
  if (r.socialMediaSummary) badges.push("Social Media Reviewed");

  res.json({
    reportId: r.id,
    workerName: r.workerName,
    workerRole: r.workerRole,
    workerPhotoUrl: r.workerPhotoUrl,
    trustScore: r.overallTrustScore,
    packageName: r.packageName,
    badges,
    summary: r.summary,
    flags: (r.flags as string[] | null) ?? [],
    verifiedAt: r.completedAt.toISOString(),
    vetCount: vr.id ? 1 : 0,
  });
});

// PUBLIC — retrieve a shared report by its share token
router.get("/reports/share/:shareToken", async (req, res): Promise<void> => {
  const entry = shareTokens.get(req.params.shareToken as string);
  if (!entry || entry.expiresAt < new Date()) {
    shareTokens.delete(req.params.shareToken as string);
    res.status(404).json({ message: "Share link expired or not found" });
    return;
  }

  const [row] = await db
    .select({ r: reportsTable, vr: vettingRequestsTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .where(eq(reportsTable.id, entry.reportId));

  if (!row) { res.status(404).json({ message: "Report not found" }); return; }

  const { r, vr } = row;
  const breakdown = r.scoreBreakdown as Record<string, number | null> | null;
  const score = r.overallTrustScore;

  res.json({
    workerName: r.workerName,
    workerRole: r.workerRole,
    workerPhotoUrl: r.workerPhotoUrl,
    packageName: r.packageName,
    trustScore: score,
    recommendation: score >= 80 ? "hire" : score >= 60 ? "caution" : "do_not_hire",
    summary: r.summary,
    identityStatus: r.identityVerified ? "passed" : "failed",
    dciStatus: r.dciCertificateStatus === "verified" ? "passed" : r.dciCertificateStatus === "not_found" ? "failed" : "pending",
    referenceStatus: breakdown?.references != null ? "passed" : "pending",
    socialMediaStatus: r.socialMediaSummary ? "passed" : "pending",
    scoreBreakdown: breakdown,
    flags: (r.flags as string[] | null) ?? [],
    createdAt: r.completedAt.toISOString(),
    sharedBy: entry.sharedBy,
    expiresAt: entry.expiresAt.toISOString(),
  });
});

// Generate a share token for a report (48-hour expiry)
router.post("/reports/:id/share", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const [row] = await db
    .select({ r: reportsTable, vr: vettingRequestsTable, emp: usersTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .innerJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(and(eq(reportsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!row) { res.status(404).json({ message: "Not found or access denied" }); return; }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  shareTokens.set(token, { reportId: id, sharedBy: row.emp.name, expiresAt });

  res.json({ shareToken: token, expiresAt: expiresAt.toISOString() });
});

router.get("/reports", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db
    .select({ r: reportsTable, vr: vettingRequestsTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .where(eq(vettingRequestsTable.employerId, req.userId!))
    .orderBy(desc(reportsTable.completedAt));

  res.json({
    reports: rows.map(({ r, vr }) => formatReport(r, vr.id)),
  });
});

// PDF download — must be defined BEFORE /reports/:id
router.get("/reports/:id/pdf", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const isAdmin = req.userRole === "admin" || req.userRole === "ops";
  const ownerCheck = isAdmin ? undefined : and(eq(reportsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!));
  const adminCheck = eq(reportsTable.id, id);

  const [row] = await db
    .select({ r: reportsTable, vr: vettingRequestsTable, emp: usersTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .innerJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(ownerCheck ?? adminCheck);

  if (!row) { res.status(404).json({ message: "Not found" }); return; }

  const { r, vr, emp } = row;
  const breakdown = r.scoreBreakdown as Record<string, number | null> | null;
  const score = r.overallTrustScore;
  const recommendation = score >= 80 ? "SAFE TO HIRE" : score >= 60 ? "PROCEED WITH CAUTION" : "DO NOT HIRE";
  const recColor: [number, number, number] = score >= 80 ? [16, 185, 129] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
  const completedDate = r.completedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const filename = `KenyaVet_Report_${r.workerName.replace(/\s+/g, "_")}_${r.id}.pdf`;

  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `KenyaVet Vetting Report — ${r.workerName}`, Author: "KenyaVet" } });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  const PAGE_W = 595.28;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Header banner ─────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, 90).fill("#0f4c3a");
  doc.fontSize(22).font("Helvetica-Bold").fillColor("#ffffff").text("KenyaVet", MARGIN, 28);
  doc.fontSize(9).font("Helvetica").fillColor("#a7f3d0").text("Domestic Staff Vetting & Background Verification", MARGIN, 54);
  doc.fontSize(9).fillColor("#a7f3d0").text(`Report #KV-${String(r.id).padStart(5, "0")}   ·   ${completedDate}`, PAGE_W - MARGIN - 180, 54, { width: 180, align: "right" });

  let y = 110;

  // ── Worker identity block ─────────────────────────────────────────────
  doc.roundedRect(MARGIN, y, CONTENT_W, 90, 6).fill("#f0fdf4").stroke("#bbf7d0");
  doc.circle(MARGIN + 40, y + 45, 32).fill("#0f4c3a");
  doc.fontSize(22).font("Helvetica-Bold").fillColor("#ffffff").text(r.workerName.charAt(0).toUpperCase(), MARGIN + 16, y + 27, { width: 48, align: "center" });
  doc.fontSize(16).font("Helvetica-Bold").fillColor("#0f4c3a").text(r.workerName, MARGIN + 84, y + 16);
  doc.fontSize(11).font("Helvetica").fillColor("#065f46").text(r.workerRole, MARGIN + 84, y + 38);
  doc.fontSize(9).fillColor("#6b7280")
    .text(`ID: ${vr.workerIdNumber}   ·   Phone: ${vr.workerPhone}`, MARGIN + 84, y + 58);
  doc.fontSize(9).fillColor("#6b7280")
    .text(`Package: ${r.packageName}   ·   Employer: ${emp.name}`, MARGIN + 84, y + 72);
  y += 104;

  // ── Trust score circle ────────────────────────────────────────────────
  const cx = MARGIN + 50;
  const cy = y + 54;
  doc.circle(cx, cy, 44).fill("#e5e7eb");
  doc.circle(cx, cy, 44).lineWidth(0).fillOpacity(0);
  // Coloured score label
  doc.fontSize(26).font("Helvetica-Bold").fillColor(recColor).fillOpacity(1)
    .text(String(score), cx - 24, cy - 18, { width: 48, align: "center" });
  doc.fontSize(9).font("Helvetica").fillColor("#6b7280")
    .text("/ 100", cx - 20, cy + 12, { width: 40, align: "center" });
  doc.fontSize(9).fillColor("#6b7280").text("Trust Score", cx - 28, cy + 28, { width: 56, align: "center" });

  // Recommendation badge
  const badgeX = MARGIN + 108;
  doc.roundedRect(badgeX, y + 34, 180, 40, 6).fill(recColor);
  doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff")
    .text(recommendation, badgeX + 8, y + 47, { width: 164, align: "center" });

  y += 120;

  // ── Section helper ────────────────────────────────────────────────────
  function sectionHeader(title: string) {
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#0f4c3a").text(title, MARGIN, y);
    doc.moveTo(MARGIN, y + 16).lineTo(MARGIN + CONTENT_W, y + 16).lineWidth(0.5).stroke("#bbf7d0");
    y += 22;
  }

  function checkRow(icon: string, label: string, status: string, pts?: string) {
    const statusColor: [number, number, number] = status === "Passed" ? [16, 185, 129] : status === "Failed" ? [239, 68, 68] : [107, 114, 128];
    doc.fontSize(10).font("Helvetica").fillColor("#111827").text(`${icon}  ${label}`, MARGIN + 4, y, { width: CONTENT_W - 80 });
    if (pts) doc.fontSize(9).fillColor("#6b7280").text(pts, MARGIN + CONTENT_W - 90, y, { width: 50, align: "right" });
    doc.fontSize(10).font("Helvetica-Bold").fillColor(statusColor).text(status, MARGIN + CONTENT_W - 55, y, { width: 55, align: "right" });
    y += 18;
  }

  // ── Verification checks ───────────────────────────────────────────────
  sectionHeader("VERIFICATION CHECKS");
  checkRow("🪪", "Identity Verification", r.identityVerified ? "Passed" : "Failed",
    breakdown?.identity != null ? `${breakdown.identity}/25 pts` : undefined);
  checkRow("🏛️", "DCI Certificate",
    r.dciCertificateStatus === "verified" ? "Passed" : r.dciCertificateStatus === "not_found" ? "Failed" : "Pending",
    breakdown?.dciCertificate != null ? `${breakdown.dciCertificate}/20 pts` : undefined);
  checkRow("📞", "Reference Checks",
    breakdown?.references != null ? "Passed" : "Pending",
    breakdown?.references != null ? `${breakdown.references}/30 pts` : undefined);
  checkRow("🌐", "Social Media Review",
    r.socialMediaSummary ? "Passed" : "Pending",
    breakdown?.socialMedia != null ? `${breakdown.socialMedia}/15 pts` : undefined);
  checkRow("📍", "Address Verification",
    r.addressVerified ? "Passed" : "Not Applicable");
  y += 8;

  // ── Score breakdown bar chart (text-based) ────────────────────────────
  if (breakdown) {
    sectionHeader("SCORE BREAKDOWN");
    const categories = [
      { label: "Identity Verification", score: breakdown.identity, max: 25 },
      { label: "Reference Checks", score: breakdown.references, max: 30 },
      { label: "DCI Certificate", score: breakdown.dciCertificate, max: 20 },
      { label: "Social Media", score: breakdown.socialMedia, max: 15 },
      { label: "Address Visit", score: (breakdown as Record<string, number | null>).addressVisit, max: 10 },
    ].filter(c => c.score != null);

    for (const cat of categories) {
      const pct = Math.min(1, (cat.score! / cat.max));
      const barW = CONTENT_W - 130;
      doc.fontSize(9).font("Helvetica").fillColor("#374151").text(cat.label, MARGIN + 4, y, { width: 130 });
      doc.rect(MARGIN + 130, y + 1, barW, 8).fill("#e5e7eb");
      doc.rect(MARGIN + 130, y + 1, barW * pct, 8).fill(score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444");
      doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text(`${cat.score}/${cat.max}`, MARGIN + 130 + barW + 6, y, { width: 30 });
      y += 16;
    }
    y += 8;
  }

  // ── Summary ───────────────────────────────────────────────────────────
  if (r.summary) {
    sectionHeader("EXECUTIVE SUMMARY");
    doc.fontSize(10).font("Helvetica").fillColor("#374151").text(r.summary, MARGIN + 4, y, { width: CONTENT_W - 8, lineGap: 3 });
    y = doc.y + 14;
  }

  // ── References ────────────────────────────────────────────────────────
  if (r.referencesSummary) {
    sectionHeader("REFERENCE CHECKS SUMMARY");
    doc.fontSize(10).font("Helvetica").fillColor("#374151").text(r.referencesSummary, MARGIN + 4, y, { width: CONTENT_W - 8, lineGap: 3 });
    y = doc.y + 14;
  }

  // ── Social media ─────────────────────────────────────────────────────
  if (r.socialMediaSummary) {
    sectionHeader("SOCIAL MEDIA REVIEW");
    doc.fontSize(10).font("Helvetica").fillColor("#374151").text(r.socialMediaSummary, MARGIN + 4, y, { width: CONTENT_W - 8, lineGap: 3 });
    y = doc.y + 14;
  }

  // ── Flags ─────────────────────────────────────────────────────────────
  if (r.flags && r.flags.length > 0) {
    sectionHeader("FLAGS & CONCERNS");
    for (const flag of r.flags) {
      doc.fontSize(10).font("Helvetica").fillColor("#dc2626").text(`⚠  ${flag}`, MARGIN + 4, y, { width: CONTENT_W - 8 });
      y += 16;
    }
    y += 6;
  }

  // ── Footer ────────────────────────────────────────────────────────────
  const footerY = 800;
  doc.moveTo(MARGIN, footerY).lineTo(PAGE_W - MARGIN, footerY).lineWidth(0.5).stroke("#e5e7eb");
  doc.fontSize(8).font("Helvetica").fillColor("#9ca3af")
    .text(`This report was generated by KenyaVet on ${completedDate}. It is confidential and intended solely for the named employer.`, MARGIN, footerY + 8, { width: CONTENT_W, align: "center" })
    .text(`KenyaVet — kenyavet.co.ke  ·  Report ID: KV-${String(r.id).padStart(5, "0")}`, MARGIN, footerY + 20, { width: CONTENT_W, align: "center" });

  doc.end();
});

router.get("/reports/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid ID" }); return; }

  const [row] = await db
    .select({ r: reportsTable, vr: vettingRequestsTable, emp: usersTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .innerJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(and(eq(reportsTable.id, id), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!row) { res.status(404).json({ message: "Not found" }); return; }
  const bd = row.r.scoreBreakdown as Record<string, number | null> | null;
  const reportBadges: string[] = [];
  if (row.r.identityVerified) reportBadges.push("Identity Verified");
  if (row.r.dciCertificateStatus === "verified") reportBadges.push("DCI Cleared");
  if (bd?.references != null && (bd.references ?? 0) >= 70) reportBadges.push("References Checked");
  if (row.r.addressVerified) reportBadges.push("Address Verified");
  if (row.r.socialMediaSummary) reportBadges.push("Social Media Reviewed");
  res.json({
    ...formatReport(row.r, row.vr.id),
    employerName: row.emp.name,
    employerNeighbourhood: row.emp.neighbourhood,
    workerIdNumber: row.vr.workerIdNumber,
    workerPhone: row.vr.workerPhone,
    socialMediaSummary: row.r.socialMediaSummary,
    referencesSummary: row.r.referencesSummary,
    scoreBreakdown: row.r.scoreBreakdown,
    flags: row.r.flags ?? [],
    badges: reportBadges,
  });
});

router.get("/reports/by-request/:requestId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requestId = parseInt(req.params.requestId as string, 10);
  if (isNaN(requestId)) { res.status(400).json({ message: "Invalid request ID" }); return; }

  const [row] = await db
    .select({ r: reportsTable, vr: vettingRequestsTable, emp: usersTable })
    .from(reportsTable)
    .innerJoin(vettingRequestsTable, eq(reportsTable.vettingRequestId, vettingRequestsTable.id))
    .innerJoin(usersTable, eq(vettingRequestsTable.employerId, usersTable.id))
    .where(and(eq(reportsTable.vettingRequestId, requestId), eq(vettingRequestsTable.employerId, req.userId!)));

  if (!row) { res.status(404).json({ message: "Not found" }); return; }
  const bd2 = row.r.scoreBreakdown as Record<string, number | null> | null;
  const reqBadges: string[] = [];
  if (row.r.identityVerified) reqBadges.push("Identity Verified");
  if (row.r.dciCertificateStatus === "verified") reqBadges.push("DCI Cleared");
  if (bd2?.references != null && (bd2.references ?? 0) >= 70) reqBadges.push("References Checked");
  if (row.r.addressVerified) reqBadges.push("Address Verified");
  if (row.r.socialMediaSummary) reqBadges.push("Social Media Reviewed");
  res.json({
    ...formatReport(row.r, row.vr.id),
    employerName: row.emp.name,
    employerNeighbourhood: row.emp.neighbourhood,
    workerIdNumber: row.vr.workerIdNumber,
    workerPhone: row.vr.workerPhone,
    socialMediaSummary: row.r.socialMediaSummary,
    referencesSummary: row.r.referencesSummary,
    scoreBreakdown: row.r.scoreBreakdown,
    flags: row.r.flags ?? [],
    badges: reqBadges,
  });
});

function formatReport(r: typeof reportsTable.$inferSelect, requestId: number) {
  const breakdown = r.scoreBreakdown as Record<string, number | null> | null;
  return {
    id: r.id,
    requestId,
    vettingRequestId: r.vettingRequestId,
    workerName: r.workerName,
    workerRole: r.workerRole,
    workerPhotoUrl: r.workerPhotoUrl,
    packageName: r.packageName,
    trustScore: r.overallTrustScore,
    scoreBreakdown: breakdown,
    summary: r.summary,
    recommendation: r.overallTrustScore >= 80 ? "hire" : r.overallTrustScore >= 60 ? "caution" : "do_not_hire",
    identityStatus: r.identityVerified ? "passed" : "failed",
    dciStatus: r.dciCertificateStatus === "verified" ? "passed" : r.dciCertificateStatus === "not_found" ? "failed" : "pending",
    referenceStatus: breakdown?.references != null ? "passed" : "pending",
    socialMediaStatus: r.socialMediaSummary ? "passed" : "pending",
    addressStatus: r.addressVerified ? "passed" : "not_applicable",
    flags: r.flags ?? [],
    createdAt: r.completedAt.toISOString(),
  };
}

export default router;
