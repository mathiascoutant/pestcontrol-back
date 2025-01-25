import { verifyToken } from "../utils/jwtUtils.js";
import DiscountShopping from "../models/discountShoppingModel.js";
import { Op } from "sequelize";

export const addDiscountCode = async (req, res) => {
  try {
    // Vérification du token
    const token = req.headers.authorization?.split(" ")[1];
    const verified = verifyToken(token);

    if (!verified) {
      return res.status(401).json({ message: "Token invalide ou manquant" });
    }

    // Vérification des droits admin
    if (verified.admin != 1) {
      return res.status(403).json({
        message: "Vous n'avez pas l'autorisation pour créer un code promo",
      });
    }

    // Récupération des données du body
    const { code, discount, startDate, endDate } = req.body;

    // Vérification de la présence de tous les champs requis
    if (!code || !discount || !startDate || !endDate) {
      return res.status(400).json({
        message:
          "Tous les champs sont obligatoires (code, discount, startDate, endDate)",
      });
    }

    // Validation du pourcentage de réduction
    const discountValue = parseFloat(discount);
    if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
      return res.status(400).json({
        message:
          "Le pourcentage de réduction doit être un nombre entre 0 et 100",
      });
    }

    // Validation des dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Les dates fournies ne sont pas valides",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        message: "La date de début doit être antérieure à la date de fin",
      });
    }

    if (start < now) {
      return res.status(400).json({
        message: "La date de début ne peut pas être dans le passé",
      });
    }

    // Vérification si le code promo existe déjà
    const existingCode = await DiscountShopping.findOne({
      where: { code },
    });

    if (existingCode) {
      return res.status(400).json({
        message: "Ce code promo existe déjà",
      });
    }

    // Création du code promo
    const newDiscountCode = await DiscountShopping.create({
      code,
      discount: discountValue,
      startDate: start,
      endDate: end,
    });

    return res.status(201).json({
      message: "Code promo créé avec succès",
      discountCode: {
        id: newDiscountCode.id,
        code: newDiscountCode.code,
        discount: newDiscountCode.discount,
        startDate: newDiscountCode.startDate,
        endDate: newDiscountCode.endDate,
        createdAt: newDiscountCode.createdAt,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la création du code promo:", error);
    return res.status(500).json({
      message: "Erreur lors de la création du code promo",
      error: error.message,
    });
  }
};

export const getAllDiscountCodes = async (req, res) => {
  try {
    // Vérification du token
    const token = req.headers.authorization?.split(" ")[1];
    const verified = verifyToken(token);

    if (!verified) {
      return res.status(401).json({ message: "Token invalide ou manquant" });
    }

    // Vérification des droits admin
    if (verified.admin != 1) {
      return res.status(403).json({
        message: "Vous n'avez pas l'autorisation pour voir les codes promo",
      });
    }

    const currentDate = new Date();

    // Récupérer tous les codes promo
    const discountCodes = await DiscountShopping.findAll({
      attributes: [
        "id",
        "code",
        "discount",
        "startDate",
        "endDate",
        "createdAt",
        "updatedAt",
      ],
      order: [
        ["createdAt", "DESC"], // Du plus récent au plus ancien
      ],
    });

    // Si aucun code promo n'est trouvé
    if (!discountCodes || discountCodes.length === 0) {
      return res.status(404).json({
        message: "Aucun code promo trouvé",
      });
    }

    // Formater et catégoriser les codes promo
    const formattedDiscountCodes = discountCodes.map((code) => {
      const status =
        currentDate < new Date(code.startDate)
          ? "À venir"
          : currentDate > new Date(code.endDate)
          ? "Expiré"
          : "Actif";

      return {
        id: code.id,
        code: code.code,
        discount: code.discount,
        startDate: code.startDate,
        endDate: code.endDate,
        status: status,
        createdAt: code.createdAt,
        updatedAt: code.updatedAt,
      };
    });

    // Compter les codes par statut
    const stats = {
      total: formattedDiscountCodes.length,
      active: formattedDiscountCodes.filter((code) => code.status === "Actif")
        .length,
      expired: formattedDiscountCodes.filter((code) => code.status === "Expiré")
        .length,
      upcoming: formattedDiscountCodes.filter(
        (code) => code.status === "À venir"
      ).length,
    };

    return res.status(200).json({
      message: "Codes promo récupérés avec succès",
      stats: stats,
      discountCodes: formattedDiscountCodes,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des codes promo:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des codes promo",
      error: error.message,
    });
  }
};

export const verifyDiscountCode = async (req, res) => {
  try {
    const code = req.params.code;

    if (!code) {
      return res.status(400).json({
        message: "Le code promo est requis",
      });
    }

    const currentDate = new Date();

    // Rechercher le code promo actif
    const discountCode = await DiscountShopping.findOne({
      where: {
        code: code,
        startDate: {
          [Op.lte]: currentDate, // Date de début inférieure ou égale à maintenant
        },
        endDate: {
          [Op.gte]: currentDate, // Date de fin supérieure ou égale à maintenant
        },
      },
      attributes: ["id", "code", "discount", "startDate", "endDate"],
    });

    // Si aucun code promo valide n'est trouvé
    if (!discountCode) {
      // Vérifier si le code existe mais n'est pas actif
      const existingCode = await DiscountShopping.findOne({
        where: { code },
        attributes: ["startDate", "endDate"],
      });

      if (!existingCode) {
        return res.status(404).json({
          message: "Code promo invalide",
          valid: false,
        });
      }

      if (currentDate < new Date(existingCode.startDate)) {
        return res.status(400).json({
          message: "Ce code promo n'est pas encore actif",
          valid: false,
          startDate: existingCode.startDate,
        });
      }

      if (currentDate > new Date(existingCode.endDate)) {
        return res.status(400).json({
          message: "Ce code promo a expiré",
          valid: false,
          endDate: existingCode.endDate,
        });
      }
    }

    // Code promo valide
    return res.status(200).json({
      message: "Code promo valide",
      valid: true,
      discountCode: {
        id: discountCode.id,
        code: discountCode.code,
        discount: discountCode.discount,
        startDate: discountCode.startDate,
        endDate: discountCode.endDate,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la vérification du code promo:", error);
    return res.status(500).json({
      message: "Erreur lors de la vérification du code promo",
      error: error.message,
    });
  }
};

export const updateDiscountCode = async (req, res) => {
  try {
    // Vérification du token
    const token = req.headers.authorization?.split(" ")[1];
    const verified = verifyToken(token);

    if (!verified) {
      return res.status(401).json({ message: "Token invalide ou manquant" });
    }

    // Vérification des droits admin
    if (verified.admin != 1) {
      return res.status(403).json({
        message: "Vous n'avez pas l'autorisation pour modifier un code promo",
      });
    }

    // Récupération des données du body
    const { id, code, discount, startDate, endDate } = req.body;

    // Vérification de la présence de tous les champs requis
    if (!id || !code || !discount || !startDate || !endDate) {
      return res.status(400).json({
        message:
          "Tous les champs sont obligatoires (id, code, discount, startDate, endDate)",
      });
    }

    // Validation du pourcentage de réduction
    const discountValue = parseFloat(discount);
    if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
      return res.status(400).json({
        message:
          "Le pourcentage de réduction doit être un nombre entre 0 et 100",
      });
    }

    // Validation des dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // Vérification du format des dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Les dates fournies ne sont pas valides",
      });
    }

    // Vérification que la date de début n'est pas dans le passé
    if (start < now) {
      return res.status(400).json({
        message: "La date de début ne peut pas être dans le passé",
        currentDate: now.toISOString(),
        providedStartDate: start.toISOString(),
      });
    }

    // Vérification que la date de fin est supérieure ou égale à la date de début
    if (end <= start) {
      return res.status(400).json({
        message: "La date de fin doit être supérieure à la date de début",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
    }

    // Vérifier si le code promo existe
    const existingDiscountCode = await DiscountShopping.findByPk(id);

    if (!existingDiscountCode) {
      return res.status(404).json({
        message: "Code promo non trouvé",
      });
    }

    // Vérifier si le nouveau code n'existe pas déjà (sauf si c'est le même code)
    if (code !== existingDiscountCode.code) {
      const codeExists = await DiscountShopping.findOne({
        where: { code },
      });

      if (codeExists) {
        return res.status(400).json({
          message: "Ce code promo existe déjà",
        });
      }
    }

    // Mise à jour du code promo
    await existingDiscountCode.update({
      code,
      discount: discountValue,
      startDate: start,
      endDate: end,
    });

    return res.status(200).json({
      message: "Code promo mis à jour avec succès",
      discountCode: {
        id: existingDiscountCode.id,
        code: existingDiscountCode.code,
        discount: existingDiscountCode.discount,
        startDate: existingDiscountCode.startDate,
        endDate: existingDiscountCode.endDate,
        updatedAt: existingDiscountCode.updatedAt,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du code promo:", error);
    return res.status(500).json({
      message: "Erreur lors de la mise à jour du code promo",
      error: error.message,
    });
  }
};

export const deleteDiscountCode = async (req, res) => {
  try {
    // Vérification du token
    const token = req.headers.authorization?.split(" ")[1];
    const verified = verifyToken(token);

    if (!verified) {
      return res.status(401).json({ message: "Token invalide ou manquant" });
    }

    // Vérification des droits admin
    if (verified.admin != 1) {
      return res.status(403).json({
        message: "Vous n'avez pas l'autorisation pour supprimer un code promo",
      });
    }

    const { id } = req.params;

    // Vérifier si le code promo existe
    const discountCode = await DiscountShopping.findByPk(id);

    if (!discountCode) {
      return res.status(404).json({
        message: "Code promo non trouvé",
      });
    }

    // Sauvegarder les informations du code promo avant suppression
    const deletedCodeInfo = {
      id: discountCode.id,
      code: discountCode.code,
      discount: discountCode.discount,
      startDate: discountCode.startDate,
      endDate: discountCode.endDate,
    };

    // Supprimer le code promo
    await discountCode.destroy();

    return res.status(200).json({
      message: "Code promo supprimé avec succès",
      deletedDiscountCode: deletedCodeInfo,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du code promo:", error);
    return res.status(500).json({
      message: "Erreur lors de la suppression du code promo",
      error: error.message,
    });
  }
};
