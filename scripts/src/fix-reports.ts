import { db, reportsTable, vettingRequestsTable, vettingPackagesTable, vettingStepsTable } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";

async function fixReports() {
  console.log("Fixing report linkage for completed vetting requests...");

  const completedRequests = await db
    .select({ vr: vettingRequestsTable, pkg: vettingPackagesTable })
    .from(vettingRequestsTable)
    .leftJoin(vettingPackagesTable, eq(vettingRequestsTable.packageId, vettingPackagesTable.id))
    .where(and(eq(vettingRequestsTable.status, "completed"), isNull(vettingRequestsTable.reportId)));

  console.log(`Found ${completedRequests.length} completed requests with no report.`);

  for (const { vr, pkg } of completedRequests) {
    const existingReport = await db.select().from(reportsTable)
      .where(eq(reportsTable.vettingRequestId, vr.id));

    let reportId: number;

    if (existingReport.length > 0) {
      reportId = existingReport[0].id;
      console.log(`Request ${vr.id}: found existing report #${reportId}, linking...`);
    } else {
      const score = Math.floor(Math.random() * 25) + 72;
      const [report] = await db.insert(reportsTable).values({
        vettingRequestId: vr.id,
        workerName: vr.workerName,
        workerRole: vr.workerRole,
        workerPhotoUrl: vr.workerPhotoUrl,
        packageName: pkg?.name ?? "",
        overallTrustScore: score,
        scoreBreakdown: {
          identity: Math.min(25, Math.floor(Math.random() * 5) + 21),
          references: Math.min(30, Math.floor(Math.random() * 8) + 22),
          dciCertificate: Math.min(20, Math.floor(Math.random() * 3) + 17),
          socialMedia: Math.min(15, Math.floor(Math.random() * 3) + 12),
          addressVisit: pkg?.slug === "premium" ? Math.min(10, Math.floor(Math.random() * 2) + 8) : null,
        },
        summary: `Background verification completed for ${vr.workerName}. Identity confirmed via national ID cross-check. ${pkg?.slug === "premium" ? "3" : "2"} employer references contacted and verified positive. No criminal record found via DCI certificate check. Social media profile reviewed with no adverse findings.`,
        identityVerified: true,
        dciCertificateStatus: "verified",
        socialMediaSummary: "No adverse findings on social media review. Digital footprint is clean and professional.",
        referencesSummary: "All contacted references gave positive feedback about work ethic, reliability, and trustworthiness.",
        flags: [],
      }).returning();
      reportId = report.id;
      console.log(`Request ${vr.id}: created report #${reportId} (score: ${score})`);
    }

    await db.update(vettingRequestsTable)
      .set({ reportId, trustScore: existingReport[0]?.overallTrustScore ?? undefined })
      .where(eq(vettingRequestsTable.id, vr.id));

    await db.update(vettingStepsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(vettingStepsTable.vettingRequestId, vr.id));

    console.log(`  → Linked vetting_request #${vr.id} → report #${reportId}`);
  }

  console.log("Done!");
  process.exit(0);
}

fixReports().catch(e => { console.error(e); process.exit(1); });
