import { Router, type IRouter } from "express";
import { db, vettingPackagesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/packages", async (_req, res): Promise<void> => {
  const packages = await db.select().from(vettingPackagesTable).orderBy(vettingPackagesTable.priceKsh);
  res.json(packages.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceKsh: p.priceKsh,
    description: p.description,
    features: p.features ?? [],
    turnaroundHours: p.turnaroundHours,
    popular: p.popular,
  })));
});

export default router;
