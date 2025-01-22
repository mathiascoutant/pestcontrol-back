import express from "express";
import { simulatePurchase } from "../controllers/paymentController.js";

const router = express.Router();

// Routes pour les paiements
router.post("/stripe/add", simulatePurchase);

export default router;
