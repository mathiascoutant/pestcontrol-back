import { verifyToken } from "../utils/jwtUtils.js";
import * as discountService from "../services/discountProductService.js";
import Product from "../models/productModel.js";

export const addDiscount = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);

  if (!verified || verified.admin !== 1) {
    return res
      .status(403)
      .json({ message: "Accès refusé : vous devez être un administrateur." });
  }

  const { productId, discount, startDate, endDate } = req.body;

  // Récupérer la date actuelle et l'ajuster (si la date système est en 2025 alors qu'on est en 2024)
  const today = new Date();
  console.log(`Date système actuelle: ${today.toISOString()}`);

  // Réinitialiser l'heure à minuit pour comparer uniquement les dates
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  console.log(`Date système sans heure: ${todayDate.toISOString()}`);

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Créer des versions des dates sans l'heure pour la comparaison
  const startDate_noTime = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endDate_noTime = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  if (isNaN(start) || isNaN(end)) {
    return res
      .status(400)
      .json({ message: "Les dates de début et de fin doivent être valides." });
  }

  // Vérifier que la date de début est au moins aujourd'hui (sans tenir compte de l'heure)
  if (startDate_noTime < todayDate) {
    return res.status(400).json({
      message: "La date de début doit être au moins aujourd'hui.",
      systemDate: todayDate.toISOString(),
      providedStartDate: startDate_noTime.toISOString(),
    });
  }

  // Vérifier que la date de fin est au moins aujourd'hui (sans tenir compte de l'heure)
  if (endDate_noTime < todayDate) {
    return res.status(400).json({
      message: "La date de fin doit être au moins aujourd'hui.",
      systemDate: todayDate.toISOString(),
      providedEndDate: endDate_noTime.toISOString(),
    });
  }

  // Vérifier que la date de fin est après la date de début
  if (endDate_noTime < startDate_noTime) {
    return res.status(400).json({
      message: "La date de fin doit être postérieure à la date de début.",
    });
  }

  const product = await Product.findByPk(productId);
  if (!product) {
    return res.status(404).json({ message: "Produit non trouvé." });
  }

  // Vérifier s'il existe déjà une réduction pour ce produit pendant cette période
  try {
    const existingDiscounts = await discountService.getDiscountsByProductId(
      productId
    );

    // Vérifier le chevauchement avec les réductions existantes
    for (const existingDiscount of existingDiscounts) {
      const existingStart = new Date(existingDiscount.startDate);
      const existingEnd = new Date(existingDiscount.endDate);

      // Créer des versions sans heure pour la comparaison
      const existingStartNoTime = new Date(
        existingStart.getFullYear(),
        existingStart.getMonth(),
        existingStart.getDate()
      );

      const existingEndNoTime = new Date(
        existingEnd.getFullYear(),
        existingEnd.getMonth(),
        existingEnd.getDate()
      );

      // Vérifier s'il y a chevauchement
      // Chevauchement si: (start1 <= end2) && (end1 >= start2)
      if (
        startDate_noTime <= existingEndNoTime &&
        endDate_noTime >= existingStartNoTime
      ) {
        return res.status(400).json({
          message:
            "Une réduction existe déjà pour ce produit pendant cette période.",
          existingDiscount: {
            id: existingDiscount.id,
            discount: existingDiscount.discount,
            startDate: existingDiscount.startDate,
            endDate: existingDiscount.endDate,
          },
        });
      }
    }
  } catch (error) {
    console.error(
      "Erreur lors de la vérification des réductions existantes:",
      error
    );
    // Continuer même en cas d'erreur pour ne pas bloquer la création
  }

  const basePrice = parseFloat(product.prix);

  // Calcul du nouveau prix avec la réduction
  const discountAmount = basePrice * (discount / 100);
  const newPrice = basePrice - discountAmount;

  try {
    const newDiscount = await discountService.createDiscount({
      productId,
      discount,
      newPrice,
      startDate: start,
      endDate: end,
    });
    return res.status(201).json(newDiscount);
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de l'ajout de la réduction",
      error: error.message,
    });
  }
};

export const updateDiscount = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);

  if (!verified || verified.admin !== 1) {
    return res
      .status(403)
      .json({ message: "Accès refusé : vous devez être un administrateur." });
  }

  const { productId, discount, startDate, endDate, discountId } = req.body;

  const today = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    return res
      .status(400)
      .json({ message: "Les dates de début et de fin doivent être valides." });
  }

  if (start < today) {
    return res
      .status(400)
      .json({ message: "La date de début doit être au moins aujourd'hui." });
  }

  if (end < today) {
    return res
      .status(400)
      .json({ message: "La date de fin doit être au moins aujourd'hui." });
  }

  try {
    const updatedDiscount = await discountService.updateDiscount({
      discountId,
      productId,
      discount,
      startDate: start,
      endDate: end,
    });

    return res.status(200).json({
      message: "Confirmation de la mise à jour de la réduction.",
      discount: updatedDiscount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteDiscount = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);

  if (!verified || verified.admin !== 1) {
    return res
      .status(403)
      .json({ message: "Accès refusé : vous devez être un administrateur." });
  }

  const { discountId } = req.body;

  if (!discountId) {
    return res
      .status(400)
      .json({ message: "L'ID de la réduction est requis." });
  }

  try {
    const result = await discountService.deleteDiscount(discountId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
