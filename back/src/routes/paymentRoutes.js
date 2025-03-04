import express from "express";
import {
  simulatePurchase,
  createPaymentIntent,
  getPaymentsByUserId,
  getAllPayments,
  validatePaymentInfo,
} from "../controllers/paymentController.js";

const router = express.Router();

// Routes pour les paiements
router.post("/stripe/clientSecret", createPaymentIntent);
router.post("/stripe/checkInformations", validatePaymentInfo);
router.post("/stripe/add", simulatePurchase);
router.get("/", getPaymentsByUserId);
router.get("/getall", getAllPayments);
export default router;
