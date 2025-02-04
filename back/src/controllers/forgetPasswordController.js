import User from "../models/userModel.js";
import ForgetPassword from "../models/forgetPasswordModel.js";
import nodemailer from "nodemailer";
import { sequelize } from "../config/database.js";
import { hashPassword } from "../utils/passwordUtils.js";

const generateRandomCode = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

export const forgetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ message: "Aucun utilisateur trouvé avec cet email." });
    }

    const existingEntry = await ForgetPassword.findOne({
      where: { userId: user.id, used: 0 },
    });

    let code;
    if (existingEntry) {
      code = existingEntry.code;
      await ForgetPassword.update(
        { createdAt: sequelize.fn("NOW") },
        { where: { userId: user.id, used: 0 } }
      );
    } else {
      code = generateRandomCode();
      await ForgetPassword.destroy({ where: { userId: user.id, used: 1 } });
      await ForgetPassword.create({
        userId: user.id,
        code: code,
        used: 0,
      });
    }

    const forgetpassword = await ForgetPassword.findOne({
      where: { userId: user.id },
    });

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
      to: email,
      subject: "Réinitialisation de votre mot de passe",
      html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #4CAF50;">Réinitialisation de votre mot de passe</h2>
                    <p style="font-size: 16px;">Vous avez demandé une réinitialisation de votre mot de passe.</p>
                    <p style="font-size: 16px;">Voici votre code de réinitialisation : <strong>${code}</strong></p>
                    <hr style="border: 1px solid #4CAF50;">
                    <p style="font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                </div>
            `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Email de réinitialisation envoyé avec succès.",
      forgetpassword,
    });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return res.status(500).json({
      message: "Erreur lors de la réinitialisation du mot de passe.",
      error: error.message,
    });
  }
};

export const verifyResetCode = async (req, res) => {
  const { id } = req.params;
  const { code } = req.body;

  try {
    const entry = await ForgetPassword.findOne({ where: { id, used: 0 } });

    if (!entry) {
      return res
        .status(404)
        .json({ message: "Entrée non trouvée ou code déjà utilisé." });
    }

    if (entry.code !== code) {
      return res
        .status(400)
        .json({ message: "Le code de réinitialisation est incorrect." });
    }

    await ForgetPassword.update({ used: 1 }, { where: { id } });

    const forgetpassword = await ForgetPassword.findOne({
      where: { id: id },
    });

    return res
      .status(200)
      .json({ message: "Code vérifié avec succès.", forgetpassword });
  } catch (error) {
    console.error(
      "Erreur lors de la vérification du code de réinitialisation:",
      error
    );
    return res.status(500).json({
      message: "Erreur lors de la vérification du code de réinitialisation.",
      error: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  const { id } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    return res.status(400).json({ message: "Les mots de passe sont requis." });
  }

  if (password.length < 8 || confirmPassword.length < 8) {
    return res.status(400).json({
      message: "Les mots de passe doivent contenir au moins 8 caractères.",
    });
  }

  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/; // Au moins 1 chiffre et 1 symbole
  if (!passwordRegex.test(password) || !passwordRegex.test(confirmPassword)) {
    return res.status(400).json({
      message:
        "Les mots de passe doivent contenir au moins 1 chiffre et 1 symbole.",
    });
  }

  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ message: "Les mots de passe ne correspondent pas." });
  }

  try {
    const entry = await ForgetPassword.findOne({ where: { id } });

    if (entry.used === "0") {
      return res.status(404).json({
        message: "Demande de réinitialisation non trouvée ou déjà utilisée.",
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (entry.createdAt < oneHourAgo) {
      await ForgetPassword.destroy({ where: { id } });
      return res.status(400).json({
        message: "Le code n'est plus valide. Veuillez refaire une demande.",
      });
    }

    const userId = entry.userId;
    const hashedPassword = hashPassword(password);

    await User.update({ password: hashedPassword }, { where: { id: userId } });

    return res
      .status(200)
      .json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return res.status(500).json({
      message: "Erreur lors de la réinitialisation du mot de passe.",
      error: error.message,
    });
  }
};
