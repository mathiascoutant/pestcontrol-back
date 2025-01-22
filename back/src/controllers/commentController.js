import { verifyToken } from "../utils/jwtUtils.js";
import * as commentService from "../services/commentService.js";
import User from "../models/userModel.js";
import puppeteer from "puppeteer";

export const addComment = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token manquant." });
  }

  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ message: "Token invalide." });
  }

  const userId = verified.userId;
  const { notation, comment, productId } = req.body;

  if (!Number.isInteger(notation) || notation < 1 || notation > 5) {
    return res.status(400).json({
      message: "La notation doit être un entier compris entre 1 et 5.",
    });
  }

  if (!comment || typeof comment !== "string") {
    return res
      .status(400)
      .json({ message: "Le commentaire ne doit pas être vide." });
  }

  if (!productId) {
    return res.status(400).json({ message: "L'ID du produit est requis." });
  }

  try {
    const newComment = await commentService.addComment({
      userId,
      notation,
      comment,
      productId,
    });
    return res.status(201).json(newComment);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const roundToHalf = (value) => {
  return Math.ceil(value * 2) / 2;
};

export const getAllCommentsByProductId = async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ message: "L'ID du produit est requis." });
  }

  try {
    const comments = await commentService.getAllCommentsByProductId(productId);

    if (!comments || comments.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun commentaire trouvé pour ce produit." });
    }

    // Calculer la moyenne des notations
    const ratings = comments.map((comment) => comment.notation); // Supposons que chaque commentaire a une propriété 'notation'
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((acc, curr) => acc + curr, 0) / ratings.length
        : null;

    // Arrondir la moyenne à 0,5 ou à l'entier supérieur
    const roundedAverageRating =
      averageRating !== null ? roundToHalf(averageRating) : null;

    const commentsWithUserInfo = await Promise.all(
      comments.map(async (comment) => {
        const user = await User.findByPk(comment.userId, {
          attributes: ["id", "pseudo"],
        });
        return {
          ...comment.toJSON(),
          user: user ? user.toJSON() : null,
        };
      })
    );

    return res.status(200).json({
      averageRating: roundedAverageRating,
      commentCount: comments.length,
      comments: commentsWithUserInfo,
    });
  } catch (error) {
    if (error.message === "Produit non trouvé.") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const deleteComment = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token manquant." });
  }

  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ message: "Token invalide." });
  }

  const userId = verified.userId;
  const isAdmin = verified.admin;
  const { commentId } = req.body;

  if (!commentId) {
    return res.status(400).json({ message: "L'ID du commentaire est requis." });
  }

  try {
    const result = await commentService.deleteComment(
      commentId,
      userId,
      isAdmin
    );
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === "Commentaire non trouvé.") {
      return res.status(404).json({ message: error.message });
    }
    if (
      error.message ===
      "Vous n'avez pas l'autorisation de supprimer ce commentaire."
    ) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const getTenLatestComments = async (req, res) => {
  try {
    const comments = await commentService.getTenLatestComments();

    if (!comments || comments.length === 0) {
      return res.status(404).json({ message: "Aucun commentaire trouvé." });
    }

    return res.status(200).json(comments);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
