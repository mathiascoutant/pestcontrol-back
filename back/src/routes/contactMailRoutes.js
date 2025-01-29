import express from "express";
import { sendContactEmail } from "../controllers/contactMailController.js";

const router = express.Router();

// Routes pour contact
router.post("/add", sendContactEmail);

export default router;
