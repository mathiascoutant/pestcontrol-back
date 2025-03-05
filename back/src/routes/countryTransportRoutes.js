import express from "express";
import {
  addCountry,
  getAllCountries,
  getCountryById,
  updateCountry,
  deleteCountry,
} from "../controllers/countryTransportController.js";

const router = express.Router();

// Route pour ajouter un nouveau pays (admin uniquement)
router.post("/add", addCountry);

// Route pour récupérer tous les pays
router.get("/", getAllCountries);

// Route pour récupérer un pays par son ID
router.get("/:id", getCountryById);

// Route pour mettre à jour un pays (admin uniquement)
router.put("/:id", updateCountry);

// Route pour supprimer un pays (admin uniquement)
router.delete("/:id", deleteCountry);

export default router;
