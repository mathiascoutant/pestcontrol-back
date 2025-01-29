import express from "express";
import { forgetPassword } from "../controllers/forgetPasswordController.js";

const router = express.Router();

// Routes pour contact
router.post("/", forgetPassword);

export default router;
