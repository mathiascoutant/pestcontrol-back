import SubCategory from "../models/subCategoriesModel.js"; // Assurez-vous que le chemin est correct
import { verifyToken } from "../utils/jwtUtils.js";
import {
  connectSFTP,
  uploadFileToVPS,
  disconnectSFTP,
  deleteFileToVPS,
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

export const getAllSubCategories = async (req, res) => {
  try {
    // Récupérer uniquement les sous-catégories avec status = 1
    const subCategories = await SubCategory.findAll({
      where: {
        status: 1, // Filtre uniquement les sous-catégories actives
      },
      attributes: [
        "id",
        "name",
        "description",
        "picture",
        "status",
        "createdAt",
        "updatedAt",
      ],
      order: [
        ["name", "ASC"], // Trier par nom dans l'ordre alphabétique
      ],
    });

    // Si aucune sous-catégorie active n'est trouvée
    if (!subCategories || subCategories.length === 0) {
      return res.status(404).json({
        message: "Aucune sous-catégorie active trouvée",
      });
    }

    // Formater la réponse
    const formattedSubCategories = subCategories.map((subCategory) => ({
      id: subCategory.id,
      name: subCategory.name,
      description: subCategory.description,
      picture: subCategory.picture,
      status: subCategory.status,
      createdAt: subCategory.createdAt,
      updatedAt: subCategory.updatedAt,
    }));

    return res.status(200).json({
      message: "Sous-catégories actives récupérées avec succès",
      count: formattedSubCategories.length,
      subCategories: formattedSubCategories,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des sous-catégories:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des sous-catégories",
      error: error.message,
    });
  }
};

export const deleteSubCategory = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);

  if (!verified) {
    return res.status(401).json({ message: "Token invalide ou manquant" });
  }

  if (verified.admin != 1) {
    return res.status(403).json({
      message:
        "Vous n'avez pas l'autorisation pour supprimer une sous-catégorie",
    });
  }

  try {
    const subCategoryId = req.params.id;

    // Récupérer la sous-catégorie
    const existingSubCategory = await SubCategory.findByPk(subCategoryId);

    if (!existingSubCategory) {
      return res.status(404).json({
        message: "Sous-catégorie non trouvée",
      });
    }

    // Récupérer l'URL de l'image
    const pictureUrl = existingSubCategory.picture;

    if (pictureUrl) {
      try {
        // Se connecter au SFTP
        await connectSFTP();

        // Extraire le nom du fichier de l'URL
        const filename = pictureUrl.split("/").pop();

        // Construire le chemin complet
        const filePath = `/var/www/medias/images/subCategories/${filename}`;

        // Supprimer le fichier via SFTP
        const deleteResult = await deleteFileToVPS(filePath);

        if (deleteResult.success) {
          console.log(`Image supprimée avec succès: ${filePath}`);
        } else {
          console.error(
            `Erreur lors de la suppression de l'image ${filePath}:`,
            deleteResult.message
          );
        }
      } catch (err) {
        console.error(`Erreur lors de la suppression de l'image:`, err);
      } finally {
        // S'assurer que la connexion SFTP est fermée
        await disconnectSFTP();
      }
    }

    // Supprimer la sous-catégorie de la base de données
    await existingSubCategory.destroy();

    return res.status(200).json({
      message: "Sous-catégorie et image associée supprimées avec succès",
      deletedSubCategory: {
        id: existingSubCategory.id,
        name: existingSubCategory.name,
        picture: pictureUrl,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la sous-catégorie:", error);
    return res.status(500).json({
      message: "Erreur lors de la suppression de la sous-catégorie",
      error: error.message,
    });
  }
};
