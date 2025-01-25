import nodemailer from "nodemailer";
import { verifyToken } from "../utils/jwtUtils.js";

export const sendTestEmail = async (req, res) => {
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
        message: "Vous n'avez pas l'autorisation pour envoyer des emails",
      });
    }

    // Récupération des données du body
    const { to, subject, text, email } = req.body;

    // Vérification des champs requis
    if (!to || !subject || !text || !email) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires (to, subject, text, email)",
      });
    }

    // Création du transporteur avec configuration SMTP
    const transporter = nodemailer.createTransport({
      host: "vps-f81ba1bf.vps.ovh.net", // Remplacez par votre hôte SMTP
      port: 587, // Le port SMTP pour l'envoi de mails
      secure: false, // false pour les connexions non sécurisées (STARTTLS), true pour SSL/TLS
      auth: {
        user: "admin@pestcontrol33.com", // L'email de l'expéditeur
        pass: "Lacoste33710?", // Le mot de passe ou la clé d'API pour l'authentification
      },
      debug: true, // Active le mode débogage
      tls: {
        rejectUnauthorized: false, // Accepte les certificats auto-signés
      },
    });

    // Configuration de l'email
    const mailOptions = {
      from: '"PestControl33" <technique@pestcontrol33.com>', // Format nom + email
      to: to,
      subject: subject,
      text: `${text}\nEmail: ${email}`,
    };

    // Envoi de l'email
    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Email envoyé avec succès",
      response: info.response,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return res.status(500).json({
      message: "Erreur lors de l'envoi de l'email",
      error: error.message,
    });
  }
};
