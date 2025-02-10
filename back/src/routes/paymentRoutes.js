import express from "express";
import {
  simulatePurchase,
  createPaymentIntent,
  getPaymentsByUserId,
  getAllPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

// Routes pour les paiements
router.post("/stripe/clientSecret", createPaymentIntent);
router.post("/stripe/add", simulatePurchase);
router.get("/list", getPaymentsByUserId);
router.get("/getall", getAllPayments);
export default router;
