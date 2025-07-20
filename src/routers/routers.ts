import { Router } from "express";
const router = Router();
import questionRouter from "./question";

router.use("/", questionRouter);
// router.use("/meeting",meetingRouter);

export default router;