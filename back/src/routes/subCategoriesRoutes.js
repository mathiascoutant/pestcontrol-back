import express from "express";
import {
  addSubCategory,
  handleUpload,
} from "../controllers/subCategoryController.js";

const router = express.Router();

// Route pour ajouter une sous-catégorie
router.post("/add", handleUpload, addSubCategory);

export default router;
