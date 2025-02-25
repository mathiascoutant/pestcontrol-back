import Stripe from "stripe";
import dotenv from "dotenv";
import Paiements from "../models/paiementModel.js";
import path from "path";
import { fileURLToPath } from "url";
import { verifyToken } from "../utils/jwtUtils.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "La clé secrète Stripe n'est pas définie dans le fichier .env"
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const sendInvoiceEmail = async (
  totalAmount,
  userEmail,
  invoiceUrl,
  invoiceNumber,
  res
) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "vps-f81ba1bf.vps.ovh.net",
      port: 587,
      secure: false,
      auth: {
        user: "noreply@pestcontrol33.com",
        pass: "Lacoste33710?",
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: '"PestControl33" <technique@pestcontrol33.com>',
      to: userEmail,
      subject: "Facture de votre commande",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #4CAF50;">Facture de votre commande</h2>
          <p style="font-size: 16px;">Merci pour votre paiement. Voici votre facture :</p>
          <hr style="border: 1px solid #4CAF50;">
          <h3 style="color: #4CAF50;">Détails de la facture :</h3>
          <p><strong>Montant payé :</strong> ${totalAmount / 100} EUR</p>
          <p><strong>Référence de la facture :</strong> ${invoiceNumber}</p>
          <hr style="border: 1px solid #4CAF50;">
          <p style="font-size: 16px;">Cliquez sur le lien ci-dessous pour accéder à votre facture au format PDF :</p>
          <p><a href="${invoiceUrl}" target="_blank">Télécharger votre facture PDF</a></p>
          <hr style="border: 1px solid #4CAF50;">
          <p style="font-size: 16px;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "Facture envoyée avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return res.status(500).json({
      message: "Erreur lors de l'envoi de l'e-mail",
      error: error.message,
    });
  }
};

export const simulatePurchase = async (req, res) => {
  const { currency, userId, products, paymentMethodId, email, isReduction } =
    req.body;

  let { reductionFunction, reductionAmount } = req.body; // Déclaration avec let

  // Assurer une valeur par défaut pour éviter NULL
  if (!isReduction) {
    reductionFunction = ""; // Valeur vide au lieu de null
    reductionAmount = 0; // 0 au lieu de null
  }

  // Vérifications de base des entrées
  if (!currency || typeof currency !== "string") {
    return res.status(400).json({ error: "La devise est requise." });
  }
  if (!paymentMethodId || typeof paymentMethodId !== "string") {
    return res.status(400).json({ error: "Le paymentMethodId est requis." });
  }
  if (!userId || !Array.isArray(products) || products.length === 0) {
    return res
      .status(400)
      .json({ error: "L'ID utilisateur et les produits sont requis." });
  }

  try {
    const existingUser = await User.findOne({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ message: "Cet utilisateur n'existe pas." });
    }

    let productDetails = [];
    let totalAmount = 0;

    // Calcul du montant total des produits sans réduction
    for (const product of products) {
      const existingProduct = await Product.findOne({
        where: { id: product.productId },
      });

      if (!existingProduct) {
        return res
          .status(404)
          .json({ message: `Le produit ${product.productId} n'existe pas.` });
      }

      const priceInCents = Math.round(existingProduct.prix * 100); // Conversion en centimes

      productDetails.push({
        id: product.productId,
        name: existingProduct.nom,
        quantity: product.quantity,
        price: priceInCents,
      });

      totalAmount += priceInCents * product.quantity; // Calcul du montant total sans réduction
    }

    let reductionInCents = 0; // Initialisation

    // Appliquer la réduction si elle est activée
    if (isReduction && reductionAmount > 0) {
      if (reductionFunction === "%") {
        if (reductionAmount > 100 || reductionAmount < 0) {
          return res
            .status(400)
            .json({ error: "Réduction en % invalide (0-100%)." });
        }
        reductionInCents = Math.round(totalAmount * (reductionAmount / 100));
      } else if (reductionFunction === "€") {
        if (reductionAmount * 100 > totalAmount || reductionAmount < 0) {
          return res
            .status(400)
            .json({ error: "Réduction en euros invalide." });
        }
        reductionInCents = Math.round(reductionAmount * 100);
      }

      totalAmount -= reductionInCents;
    } else {
      reductionFunction = ""; // Valeur vide pour éviter NULL
      reductionAmount = 0; // 0 au lieu de null
    }

    // Si la réduction couvre entièrement la facture, ne pas payer
    const shouldSkipPayment = totalAmount <= 0;

    // Recherche de l'utilisateur dans Stripe
    const customers = await stripe.customers.search({
      query: `email:'${email}'`,
    });
    let customer = customers.data.length > 0 ? customers.data[0] : null;

    if (!customer) {
      customer = await stripe.customers.create({
        email: email,
        name: existingUser.name,
      });
    }

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    // Créer la facture
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      due_date: Math.floor(Date.now() / 1000) + 3600,
      auto_advance: !shouldSkipPayment,
    });

    // Ajouter les produits à la facture
    for (const product of productDetails) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        unit_amount: product.price,
        quantity: product.quantity,
        currency: "eur",
        description: `${product.name} (x${product.quantity})`,
        invoice: invoice.id,
      });
    }

    // Ajouter la réduction si applicable
    if (isReduction && reductionInCents > 0) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        unit_amount: -reductionInCents, // Réduction en centimes, valeur négative
        quantity: 1,
        currency: "eur",
        description: `Réduction (${reductionFunction} ${reductionAmount})`,
        invoice: invoice.id,
      });
    }

    // Finaliser la facture
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Si la facture est de 0€, ne pas payer
    if (shouldSkipPayment) {
      return res.status(200).json({
        message: "La facture a été générée avec une réduction complète.",
        invoiceId: finalizedInvoice.id,
        amount: 0,
      });
    }

    // Payer la facture
    const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id);

    if (!paidInvoice.hosted_invoice_url) {
      return res
        .status(500)
        .json({ error: "Erreur lors de la création de la facture." });
    }

    if (paidInvoice.status === "paid") {
      // Sauvegarder le paiement en base de données
      await Paiements.create({
        userId,
        products: JSON.stringify(productDetails),
        totalPrice: totalAmount / 100,
        invoice: paidInvoice.id,
        currency,
        source: "card",
        urlInvoice: paidInvoice.hosted_invoice_url,
        isReduction: isReduction || false,
        reductionFunction, // Garder "" au lieu de null
        reductionAmount, // Garder 0 au lieu de null
      });

      // Envoi de l'email
      await sendInvoiceEmail(
        totalAmount,
        email,
        paidInvoice.hosted_invoice_url,
        finalizedInvoice.number,
        res
      );
    } else {
      return res
        .status(400)
        .json({ error: "Échec du paiement de la facture." });
    }
  } catch (error) {
    console.error("Erreur lors du paiement :", error);
    return res
      .status(500)
      .json({ error: `Échec du paiement : ${error.message}` });
  }
};

export const retrieveCharge = async (req, res) => {
  const { chargeId } = req.params;

  try {
    const charge = await stripe.charges.retrieve(chargeId);
    return res.status(200).json(charge);
  } catch (error) {
    console.error("Erreur lors de la récupération de la charge :", error);
    return res.status(500).json({ error: error.message });
  }
};

export const createPaymentIntent = async (req, res) => {
  const { currency, paymentMethodId, userId, products } = req.body;

  // Vérification des paramètres d'entrée
  if (!currency || typeof currency !== "string") {
    return res.status(400).json({ error: "La devise est requise." });
  }
  if (!paymentMethodId || typeof paymentMethodId !== "string") {
    return res.status(400).json({ error: "Le paymentMethodId est requis." });
  }
  if (!userId || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      error: "L'ID utilisateur et les produits sont requis.",
    });
  }

  try {
    // Vérification de l'existence de l'utilisateur
    const existingUser = await User.findOne({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ message: "Cet utilisateur n'existe pas." });
    }

    let productDetails = [];
    let totalAmount = 0;

    // Calcul du montant total en parcourant les produits
    for (const product of products) {
      const existingProduct = await Product.findOne({
        where: { id: product.productId },
      });

      if (!existingProduct) {
        return res.status(404).json({
          message: `Le produit ${product.productId} n'existe pas.`,
        });
      }

      // Conversion du prix en centimes
      const priceInCents = Math.round(existingProduct.prix * 100);

      productDetails.push({
        id: product.productId,
        name: existingProduct.nom,
        quantity: product.quantity,
        price: priceInCents,
      });

      // Ajout du montant pour chaque produit
      totalAmount += priceInCents * product.quantity;
    }

    // Création du PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount, // Le montant total calculé
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      payment_method_options: {
        card: {
          request_three_d_secure: "any", // Demande 3D Secure si nécessaire
        },
      },
    });

    // Vérification du statut du PaymentIntent
    if (paymentIntent.status === "requires_action") {
      return res.status(200).json({
        requires_action: true,
        client_secret: paymentIntent.client_secret,
      });
    }

    // Retour si le paiement a réussi
    return res.status(200).json({
      message: "Paiement réussi",
      client_secret: paymentIntent.client_secret,
    });
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
