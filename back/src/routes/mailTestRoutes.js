import express from "express";
import { sendTestEmail } from "../controllers/mailTestController.js";

const router = express.Router();

router.post("/", sendTestEmail);

export default router;
