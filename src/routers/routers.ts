import { Router } from "express";
const router = Router();
import authRouter from "./auth";
import answerRouter from "./answer";

router.use("/auth", authRouter);
router.use("/answer", answerRouter);

export default router;