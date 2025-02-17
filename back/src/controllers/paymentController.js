import Stripe from "stripe";
import dotenv from "dotenv";
import Paiements from "../models/paiementModel.js";
import path from "path";
import { fileURLToPath } from "url";
import { verifyToken } from "../utils/jwtUtils.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement à partir du fichier .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "La clé secrète Stripe n'est pas définie dans le fichier .env"
  );
}

// Utiliser la clé secrète Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Contrôleur pour simuler un achat
export const simulatePurchase = async (req, res) => {
  const { amount, currency, userId, products, source } = req.body; // Récupérer les données de la requête

  // Validation des données d'entrée
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return res
      .status(400)
      .json({ error: "Le montant doit être un nombre positif." });
  }
  if (!currency || typeof currency !== "string") {
    return res.status(400).json({ error: "La devise est requise." });
  }
  if (!source || typeof source !== "string") {
    return res.status(400).json({ error: "Le token de carte est requis." });
  }
  if (!userId || !Array.isArray(products) || products.length === 0) {
    return res
      .status(400)
      .json({ error: "L'ID utilisateur et les produits sont requis." });
  }

  try {
    // Vérifier si l'utilisateur existe dans la base de données
    const existingUser = await User.findOne({
      where: { id: userId }, // Vérifiez si l'ID utilisateur existe
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "Cet utilisateur n'existe pas.",
      });
    }

    // Vérifier si chaque productId existe
    for (const product of products) {
      const { productId, quantity } = product;

      // Vérifiez que le productId est valide
      if (!productId || typeof productId !== "number") {
        return res
          .status(400)
          .json({ error: "productId doit être un nombre valide." });
      }

      const existingProduct = await Product.findOne({
        where: { id: productId }, // Vérifiez si le productId existe
      });

      if (!existingProduct) {
        return res.status(404).json({
          message: `Le produit avec l'ID ${productId} n'existe pas.`,
        });
      }

      // Vérifiez que la quantité est valide
      if (!quantity || typeof quantity !== "number" || quantity <= 0) {
        return res
          .status(400)
          .json({
            error: `La quantité pour le produit ${productId} doit être un nombre positif.`,
          });
      }
    }

    // Créer une charge
    const charge = await stripe.charges.create({
      amount, // Montant en cents
      currency,
      source, // Token de la carte ou ID de source
      description: "Achat simulé",
    });

    // Insérer les informations de paiement dans la base de données
    const paiement = await Paiements.create({
      userId,
      products: JSON.stringify(products), // Convertir les produits en chaîne JSON
      totalPrice: amount / 100, // Convertir le montant en euros
      invoice: charge.id, // Utiliser l'ID de la charge comme numéro de facture
      currency, // Nouvelle colonne pour la devise
      source, // Nouvelle colonne pour le type de paiement
    });

    // Répondre avec les détails de la charge et l'ID du paiement
    return res.status(200).json({ charge, paymentId: paiement.id });
  } catch (error) {
    console.error("Erreur lors de la simulation d'achat :", error);
    return res.status(500).json({ error: error.message });
  }
};

// Contrôleur pour récupérer une charge existante
export const retrieveCharge = async (req, res) => {
  const { chargeId } = req.params; // Récupérer l'ID de la charge depuis les paramètres de la requête

  try {
    // Récupérer la charge
    const charge = await stripe.charges.retrieve(chargeId);

    // Répondre avec les détails de la charge
    return res.status(200).json(charge);
  } catch (error) {
    console.error("Erreur lors de la récupération de la charge :", error);
    return res.status(500).json({ error: error.message });
  }
};

// Contrôleur pour créer un PaymentIntent
export const createPaymentIntent = async (req, res) => {
  const { amount, currency } = req.body; // Récupérer les données de la requête

  // Validation des données d'entrée
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return res
      .status(400)
      .json({ error: "Le montant doit être un nombre positif." });
  }
  if (!currency || typeof currency !== "string") {
    return res.status(400).json({ error: "La devise est requise." });
  }

  try {
    // Créer un PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Montant en cents
      currency,
    });

    // Répondre avec le client_secret
    return res.status(200).json({ client_secret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Erreur lors de la création du PaymentIntent :", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getPaymentsByUserId = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ message: "Token invalide ou manquant" });
  }

  const userId = verified.userId; // Supposons que l'ID utilisateur est stocké dans le token

  try {
    // Récupérer les paiements associés à l'ID utilisateur
    const paiements = await Paiements.findAll({
      where: {
        userId: userId, // Filtrer par userId
      },
    });

    // Si aucun paiement n'est trouvé
    if (!paiements || paiements.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun paiement trouvé pour cet utilisateur." });
    }

    // Répondre avec les paiements trouvés
    return res.status(200).json({
      message: "Paiements récupérés avec succès",
      paiements,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des paiements :", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des paiements",
      error: error.message,
    });
  }
};

export const getAllPayments = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ message: "Token invalide ou manquant" });
  }

  if (verified.admin != 1) {
    return res.status(403).json({
      message: "Vous n'avez pas l'autorisation pour lister les paiements",
    });
  }

  try {
    // Récupérer les paiements associés à l'ID utilisateur
    const paiements = await Paiements.findAll({});

    // Si aucun paiement n'est trouvé
    if (!paiements || paiements.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun paiement trouvé pour cet utilisateur." });
    }

    // Répondre avec les paiements trouvés
    return res.status(200).json({
      message: "Paiements récupérés avec succès",
      paiements,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des paiements :", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des paiements",
      error: error.message,
    });
  }
};
