import Stripe from "stripe";
import dotenv from "dotenv";

// Charger les variables d'environnement à partir du fichier .env
dotenv.config();

// Utiliser la clé secrète Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Contrôleur pour simuler un achat
export const simulatePurchase = async (req, res) => {
  const { amount, currency, source } = req.body; // Récupérer les données de la requête

  // Validation des données d'entrée<
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

  try {
    // Créer une charge
    const charge = await stripe.charges.create({
      amount, // Montant en cents
      currency,
      source, // Token de la carte ou ID de source
      description: "Achat simulé",
    });

    // Répondre avec les détails de la charge
    return res.status(200).json(charge);
  } catch (error) {
    console.error("Erreur lors de la création de la charge :", error);
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
