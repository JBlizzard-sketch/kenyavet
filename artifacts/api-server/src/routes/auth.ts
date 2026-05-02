import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "kenyavet-secret-dev";

// In-memory password reset tokens (keyed by token string)
const resetTokens = new Map<string, { userId: number; email: string; expiresAt: number }>();

function signToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}

function generateReferralCode(): string {
  return "KV" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    neighbourhood: user.neighbourhood,
    referralCode: user.referralCode,
    creditBalance: user.creditBalance ?? 0,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, name, role, phone, neighbourhood } = parsed.data;
  const incomingRefCode = typeof req.body.referralCode === "string" ? req.body.referralCode.trim().toUpperCase() : null;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  // Look up referrer if a referral code was supplied
  let referredBy: number | undefined;
  let referrerId: number | undefined;
  let referrerCredit = 0;
  if (incomingRefCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, incomingRefCode));
    if (referrer) {
      referredBy = referrer.id;
      referrerId = referrer.id;
      referrerCredit = (referrer.creditBalance ?? 0) + 500;
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const referralCode = generateReferralCode();

  const [user] = await db.insert(usersTable).values({
    email, passwordHash, name, role, phone, neighbourhood,
    referralCode,
    referredBy,
  }).returning();

  // Award KSh 500 credit to referrer
  if (referrerId != null) {
    await db.update(usersTable)
      .set({ creditBalance: referrerCredit })
      .where(eq(usersTable.id, referrerId));
  }

  const token = signToken(user.id, user.role);
  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken(user.id, user.role);
  res.json({ user: formatUser(user), token });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.get("/auth/me/referral", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select({
    referralCode: usersTable.referralCode,
    creditBalance: usersTable.creditBalance,
  }).from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const referred = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.referredBy, req.userId!));

  res.json({
    referralCode: user.referralCode,
    creditBalance: user.creditBalance ?? 0,
    referralCount: referred.length,
  });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!user) {
    res.json({ message: "If that email is registered, a reset link has been sent." }); return;
  }

  for (const [t, data] of resetTokens.entries()) {
    if (data.userId === user.id || data.expiresAt < Date.now()) resetTokens.delete(t);
  }

  const token = crypto.randomBytes(32).toString("hex");
  resetTokens.set(token, { userId: user.id, email: user.email, expiresAt: Date.now() + 60 * 60 * 1000 });

  const baseUrl = (process.env.REPLIT_DOMAINS ?? "localhost:80").split(",")[0];
  const resetUrl = `https://${baseUrl}/reset-password?token=${token}`;

  res.json({ message: "Reset link generated.", resetUrl, token });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    res.status(400).json({ error: "Token and new password are required" }); return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" }); return;
  }
  const entry = resetTokens.get(token);
  if (!entry) {
    res.status(400).json({ error: "Invalid or expired reset link" }); return;
  }
  if (entry.expiresAt < Date.now()) {
    resetTokens.delete(token);
    res.status(400).json({ error: "Reset link has expired. Please request a new one." }); return;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, entry.userId));
  resetTokens.delete(token);
  res.json({ message: "Password reset successfully" });
});

router.patch("/auth/me/password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password are required" }); return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, req.userId!));
  res.json({ message: "Password updated successfully" });
});

router.patch("/auth/me/update", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, phone, neighbourhood } = req.body;
  const update: Record<string, unknown> = {};
  if (name) update.name = name;
  if (phone !== undefined) update.phone = phone || null;
  if (neighbourhood !== undefined) update.neighbourhood = neighbourhood || null;

  const [user] = await db.update(usersTable)
    .set(update)
    .where(eq(usersTable.id, req.userId!))
    .returning();

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.get("/auth/me/notifications", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select({ notificationPrefs: usersTable.notificationPrefs })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    prefs: user.notificationPrefs ?? {
      report_ready: true,
      payment_confirmed: true,
      re_vetting_due: true,
      weekly_digest: false,
    },
  });
});

router.patch("/auth/me/notifications", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const allowed = ["report_ready", "payment_confirmed", "re_vetting_due", "weekly_digest"];
  const [current] = await db.select({ notificationPrefs: usersTable.notificationPrefs })
    .from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!current) { res.status(404).json({ error: "User not found" }); return; }

  const base = current.notificationPrefs ?? { report_ready: true, payment_confirmed: true, re_vetting_due: true, weekly_digest: false };
  const merged: Record<string, boolean> = { ...base as Record<string, boolean> };
  for (const key of allowed) {
    if (typeof req.body[key] === "boolean") merged[key] = req.body[key];
  }

  await db.update(usersTable).set({ notificationPrefs: merged as typeof base }).where(eq(usersTable.id, req.userId!));
  res.json({ prefs: merged });
});

export default router;
