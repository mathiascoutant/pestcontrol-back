import express from "express";
import {
  forgetPassword,
  verifyResetCode,
  resetPassword,
} from "../controllers/forgetPasswordController.js";

const router = express.Router();

// Routes pour contact
router.post("/", forgetPassword);
router.post("/check/:id", verifyResetCode);
router.post("/reset/:id", resetPassword);

export default router;
