import express from "express";
import {
  addDiscountCode,
  getAllDiscountCodes,
  verifyDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
} from "../controllers/discountShoppingController.js";

const router = express.Router();

router.post("/add", addDiscountCode);
router.get("/", getAllDiscountCodes);
router.get("/:code", verifyDiscountCode);
router.put("/", updateDiscountCode);
router.delete("/:id", deleteDiscountCode);

export default router;
