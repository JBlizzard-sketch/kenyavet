import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import packagesRouter from "./packages";
import vettingRequestsRouter from "./vetting-requests";
import referencesRouter from "./references";
import workersRouter from "./workers";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";
import staffRouter from "./staff";
import adminRouter from "./admin";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(packagesRouter);
router.use(vettingRequestsRouter);
router.use(referencesRouter);
router.use(workersRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(staffRouter);
router.use(adminRouter);
router.use(paymentsRouter);

export default router;
