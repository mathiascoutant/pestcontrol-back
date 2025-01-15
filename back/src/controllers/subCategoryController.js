import SubCategory from "../models/subCategoriesModel.js"; // Assurez-vous que le chemin est correct
import { verifyToken } from "../utils/jwtUtils.js";
import {
  connectSFTP,
  uploadFileToVPS,
  disconnectSFTP,
} from "../services/uploadService.js"; // Assurez-vous que ces fonctions existent
import multer from "multer";
import { MEDIA_CONFIG } from "../config/mediaConfig.js";

import { createSubCategory } from "../services/subCategoryService.js";

const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: MEDIA_CONFIG.MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    // Vérifier si le fichier est une image ou une vidéo
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error("Format de fichier non supporté"));
    }
  },
});

export const handleUpload = (req, res, next) => {
  uploadMiddleware.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.log("test");
      return res
        .status(400)
        .json({ message: `Erreur d'upload: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

export const addSubCategory = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);

  if (!verified) {
    return res.status(401).json({ message: "Token invalide ou manquant" });
  }

  if (verified.admin != 1) {
    return res.status(403).json({
      message: "Vous n'avez pas l'autorisation pour créer un article",
    });
  }

  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires.",
      });
    }

    // Vérification des fichiers uploadés
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "Vous devez fournir au moins un fichier." });
    }

    // Vérifier qu'il y a au moins une image
    const imageFiles = req.files.filter(
      (file) => file.mimetype && file.mimetype.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      return res
        .status(400)
        .json({ message: "Vous devez fournir au moins une image." });
    }

    // Vérification qu'il n'y a qu'un seul fichier
    if (req.files && req.files.length > 1) {
      return res
        .status(400)
        .json({ message: "Vous ne pouvez uploader qu'une seule image." });
    }

    const existingSubCategory = await SubCategory.findOne({ where: { name } });
    if (existingSubCategory) {
      return res
        .status(400)
        .json({ message: "Une sous-catégorie avec ce nom existe déjà." });
    }

    const newSubCategory = await createSubCategory({
      name,
      description,
      status: 1,
      picture: null,
    });

    await connectSFTP();

    const mediaFile = imageFiles[0]; // Prendre le premier fichier image
    const mediaType = mediaFile.mimetype.startsWith("image/")
      ? "images"
      : "videos";

    const mediaResult = await uploadFileToVPS(
      mediaFile,
      newSubCategory.id,
      1,
      mediaType,
      "subCategories"
    );

    if (mediaResult.success) {
      const baseUrl = `http://37.187.225.41/medias/${mediaType}/subCategories`;
      const pictureUrl = `${baseUrl}/${mediaResult.filename}`;

      // Mettre à jour la sous-catégorie avec le chemin de l'image
      await newSubCategory.update({ picture: pictureUrl });
    } else {
      console.error(
        "Erreur lors de l'upload du fichier :",
        mediaResult.message
      );
    }

    await disconnectSFTP();

    const productData = newSubCategory.toJSON();
    delete productData.picture; // Supprimer la propriété picture pour la réponse

    res.status(201).json({
      message: "Sous-catégorie créée avec succès",
      ...productData,
    });
  } catch (error) {
    console.error("Erreur lors de la création de la sous-catégorie :", error);
    res.status(500).json({
      message: "Erreur lors de la création de la sous-catégorie",
      error: error.message,
    });
  }
};
