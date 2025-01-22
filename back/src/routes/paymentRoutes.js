import express from "express";
import {
  simulatePurchase,
  createPaymentIntent,
} from "../controllers/paymentController.js";

const router = express.Router();

// Routes pour les paiements
router.post("/stripe/clientSecret", createPaymentIntent);
router.post("/stripe/add", simulatePurchase);

export default router;
