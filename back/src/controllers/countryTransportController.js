import CountryTransport from "../models/countryTransportModel.js";
import { verifyToken } from "../utils/jwtUtils.js";

// Fonction pour ajouter un nouveau pays
export const addCountry = async (req, res) => {
  try {
    // Vérification du token JWT
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Token d'authentification manquant" });
    }

    // Vérification de la validité du token
    const verified = verifyToken(token);
    if (!verified) {
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }

    // Vérification des droits administrateur
    if (verified.admin !== 1) {
      return res
        .status(403)
        .json({ message: "Accès refusé. Droits d'administrateur requis" });
    }

    // Récupération des données du corps de la requête
    const { name, prix, status } = req.body;

    // Vérification que les champs obligatoires ne sont pas vides
    if (!name || !prix) {
      return res
        .status(400)
        .json({ message: "Le nom et le prix sont obligatoires" });
    }

    // Vérification si le nom du pays existe déjà
    const existingCountry = await CountryTransport.findOne({ where: { name } });
    if (existingCountry) {
      return res.status(409).json({ message: "Ce nom de pays existe déjà" });
    }

    // Création du nouveau pays
    const newCountry = await CountryTransport.create({
      name,
      prix,
      status: status !== undefined ? status : 1,
    });

    // Réponse avec le pays créé
    return res.status(201).json({
      message: "Pays ajouté avec succès",
      country: newCountry,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout du pays:", error);
    return res.status(500).json({
      message: "Erreur lors de l'ajout du pays",
      error: error.message,
    });
  }
};

// Fonction pour récupérer tous les pays
export const getAllCountries = async (req, res) => {
  try {
    const countries = await CountryTransport.findAll({
      where: { status: 1 },
    });

    return res.status(200).json({
      message: "Liste des pays récupérée avec succès",
      countries,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des pays:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des pays",
      error: error.message,
    });
  }
};

// Fonction pour récupérer un pays par son ID
export const getCountryById = async (req, res) => {
  try {
    const { id } = req.params;

    const country = await CountryTransport.findOne({
      where: { id, status: 1 },
    });

    if (!country) {
      return res.status(404).json({ message: "Pays non trouvé" });
    }

    return res.status(200).json({
      message: "Pays récupéré avec succès",
      country,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du pays:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération du pays",
      error: error.message,
    });
  }
};

// Fonction pour mettre à jour un pays
export const updateCountry = async (req, res) => {
  try {
    // Vérification du token JWT
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Token d'authentification manquant" });
    }

    // Vérification de la validité du token
    const verified = verifyToken(token);
    if (!verified) {
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }

    // Vérification des droits administrateur
    if (verified.admin !== 1) {
      return res
        .status(403)
        .json({ message: "Accès refusé. Droits d'administrateur requis" });
    }

    const { id } = req.params;
    const { name, prix, status } = req.body;

    // Vérification que les champs obligatoires ne sont pas vides
    if (!name || !prix) {
      return res
        .status(400)
        .json({ message: "Le nom et le prix sont obligatoires" });
    }

    // Vérification si le pays existe
    const country = await CountryTransport.findByPk(id);
    if (!country) {
      return res.status(404).json({ message: "Pays non trouvé" });
    }

    // Vérification si le nouveau nom existe déjà (sauf pour le pays actuel)
    if (name !== country.name) {
      const existingCountry = await CountryTransport.findOne({
        where: { name },
      });
      if (existingCountry) {
        return res.status(409).json({ message: "Ce nom de pays existe déjà" });
      }
    }

    // Mise à jour du pays
    await country.update({
      name,
      prix,
      status: status !== undefined ? status : country.status,
    });

    return res.status(200).json({
      message: "Pays mis à jour avec succès",
      country,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du pays:", error);
    return res.status(500).json({
      message: "Erreur lors de la mise à jour du pays",
      error: error.message,
    });
  }
};

// Fonction pour supprimer un pays (suppression physique)
export const deleteCountry = async (req, res) => {
  try {
    // Vérification du token JWT
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Token d'authentification manquant" });
    }

    // Vérification de la validité du token
    const verified = verifyToken(token);
    if (!verified) {
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }

    // Vérification des droits administrateur
    if (verified.admin !== 1) {
      return res
        .status(403)
        .json({ message: "Accès refusé. Droits d'administrateur requis" });
    }

    const { id } = req.params;

    // Vérification si le pays existe
    const country = await CountryTransport.findByPk(id);
    if (!country) {
      return res.status(404).json({ message: "Pays non trouvé" });
    }

    // Suppression physique de l'enregistrement
    await CountryTransport.destroy({
      where: { id },
    });

    return res.status(200).json({
      message: "Pays supprimé définitivement avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du pays:", error);
    return res.status(500).json({
      message: "Erreur lors de la suppression du pays",
      error: error.message,
    });
  }
};
