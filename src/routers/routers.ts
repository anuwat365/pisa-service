import { Router } from "express";
const router = Router();
import questionRouter from "./question";
import authRouter from "./auth";
import answerRouter from "./answer";

router.use("/", questionRouter);
router.use("/auth", authRouter);
router.use("/answer", answerRouter);

export default router;