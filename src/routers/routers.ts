import { Router } from "express";
const router = Router();
import questionRouter from "./question";
import authRouter from "./auth";

router.use("/", questionRouter);
router.use("/auth", authRouter);
// router.use("/meeting",meetingRouter);

export default router;