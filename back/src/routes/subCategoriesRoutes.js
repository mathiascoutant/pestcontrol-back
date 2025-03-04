import express from "express";
import {
  addSubCategory,
  handleUpload,
  getAllSubCategories,
  deleteSubCategory,
  getProductsBySubCategory,
} from "../controllers/subCategoryController.js";

const router = express.Router();

// Route pour ajouter une sous-catégorie
router.post("/add", handleUpload, addSubCategory);
router.get("/", getAllSubCategories);
router.get("/:id", getProductsBySubCategory);
router.delete("/:id", deleteSubCategory);

export default router;
