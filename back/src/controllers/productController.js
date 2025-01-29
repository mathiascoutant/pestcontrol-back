import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
} from "../services/productService.js";
import Product from "../models/productModel.js";
import { verifyToken } from "../utils/jwtUtils.js";
import Favorite from "../models/favoritesModel.js";
import Discount from "../models/discountProductsModel.js";
import { Op } from "sequelize";
import multer from "multer";
import { MEDIA_CONFIG } from "../config/mediaConfig.js";
import {
  connectSFTP,
  uploadFileToVPS,
  disconnectSFTP,
  deleteFileToVPS,
} from "../services/uploadService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: MEDIA_CONFIG.MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error("Format de fichier non supporté"));
    }
  },
});

const unlink = promisify(fs.unlink);
const exists = promisify(fs.exists);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export const addProduct = async (req, res) => {
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
    const { nom, description, stock, prix, conseilsUtilisation } = req.body;

    const formattedPrix = parseFloat(prix.replace(",", "."));

    if (
      !nom ||
      !description ||
      !stock ||
      !conseilsUtilisation ||
      isNaN(formattedPrix)
    ) {
      return res.status(400).json({
        message:
          "Tous les champs sont obligatoires et le prix doit être un nombre valide.",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "Vous devez fournir au moins un fichier." });
    }

    // Vérifier qu'il y a au moins une image
    const imageFiles = req.files.filter((file) =>
      file.mimetype.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      return res
        .status(400)
        .json({ message: "Vous devez fournir au moins une image." });
    }

    const existingProduct = await Product.findOne({ where: { nom } });
    if (existingProduct) {
      return res
        .status(400)
        .json({ message: "Un produit avec ce nom existe déjà." });
    }

    const newProduct = await createProduct({
      nom,
      description,
      stock,
      status: 1,
      prix: formattedPrix,
      favorites: 0,
      conseilsUtilisation,
      medias: {
        imageUrls: [],
        videoUrls: [],
      },
    });

    const mediaUrls = {
      imageUrls: [],
      videoUrls: [],
    };

    await connectSFTP();

    for (let i = 0; i < req.files.length; i++) {
      const mediaFile = req.files[i];
      let mediaType = mediaFile.mimetype.startsWith("image/")
        ? "images"
        : "videos";

      const mediaResult = await uploadFileToVPS(
        mediaFile,
        newProduct.id,
        i + 1,
        mediaType,
        "products"
      );

      if (mediaResult.success) {
        const baseUrl = `https://37.187.225.41/medias/${mediaType}/products`;
        if (mediaType === "images") {
          mediaUrls.imageUrls.push(`${baseUrl}/${mediaResult.filename}`);
        } else if (mediaType === "videos") {
          mediaUrls.videoUrls.push(`${baseUrl}/${mediaResult.filename}`);
        }
      } else {
        console.error(
          "Erreur lors de l'upload du fichier :",
          mediaResult.message
        );
      }
    }

    await disconnectSFTP();

    await newProduct.update({ medias: mediaUrls });

    const productData = newProduct.toJSON();
    delete productData.medias;

    res.status(201).json({
      message: "Produit créé avec succès",
      product: {
        ...productData,
        mediaUrls,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la création du produit:", error);
    res.status(500).json({
      message: "Erreur lors de la création du produit",
      error: error.message,
    });
  }
};

export const fetchAllProducts = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const verified = verifyToken(token);
    const userId = verified ? verified.userId : null;
    const isAdmin = verified && verified.admin === 1;

    const products = await getAllProducts();

    const filteredProducts = products.filter((product) => product.status === 1);

    const productIds = filteredProducts.map((product) => product.id);

    const discounts = await Discount.findAll({
      where: {
        productId: productIds,
        endDate: { [Op.gte]: new Date() },
      },
    });

    const discountMap = {};
    discounts.forEach((discount) => {
      discountMap[discount.productId] = {
        newPrice: discount.newPrice,
        discount: discount.discount,
      };
    });

    let likedProductIds = new Set();
    if (userId) {
      // Récupérer les favoris de l'utilisateur
      const userFavorites = await Favorite.findAll({
        where: { userId: userId },
      });

      likedProductIds = new Set(
        userFavorites.map((favorite) => favorite.productId)
      );
    }

    const productsWithLikes = filteredProducts.map((product) => {
      const discountInfo = discountMap[product.id] || {};
      const productData = {
        ...product.toJSON(),
        newPrice: discountInfo.newPrice || null,
        discount: discountInfo.discount || null,
        liked: likedProductIds.has(product.id) ? 1 : 0,
      };

      if (!isAdmin) {
        delete productData.favorites;
      }

      return productData;
    });

    return res.status(200).json(productsWithLikes);
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des produits",
      error: error.message,
    });
  }
};

export const fetchProduct = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const verified = token ? verifyToken(token) : null;
    const userId = verified ? verified.userId : null;
    const isAdmin = verified && verified.admin === 1;

    const productId = req.params.id;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    const discounts = await Discount.findAll({
      where: {
        productId: productId,
        endDate: { [Op.gte]: new Date() },
      },
    });

    const discountInfo =
      discounts.length > 0
        ? {
            newPrice: discounts[0].newPrice,
            discount: discounts[0].discount,
          }
        : {};

    let like = 0;
    if (userId) {
      const userFavorite = await Favorite.findOne({
        where: { userId: userId, productId: productId },
      });
      like = userFavorite ? 1 : 0;
    }

    const medias = product.medias;

    const mediaUrls = {
      imageUrls: medias.imageUrls,
      videoUrls: medias.videoUrls,
    };

    const productData = {
      id: product.id,
      nom: product.nom,
      description: product.description,
      stock: product.stock,
      status: product.status,
      prix: product.prix,
      conseilsUtilisation: product.conseilsUtilisation,
      newPrice: discountInfo.newPrice || null,
      discount: discountInfo.discount || null,
      like: like,
    };

    if (isAdmin) {
      productData.favorites = product.favorites;
    }

    productData.medias = mediaUrls;

    return res.status(200).json(productData);
  } catch (error) {
    console.error("Erreur lors de la récupération du produit:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération du produit",
      error: "Une erreur est survenue, veuillez réessayer plus tard.",
    });
  }
};

export const updateProduct = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ message: "Token invalide ou manquant" });
  }
  if (verified.admin != 1) {
    return res.status(403).json({
      message: "Vous n'avez pas l'autorisation pour créer un atricle",
    });
  }

  try {
    const productId = req.params.id;
    const { nom, description, stock, status, prix } = req.body;

    const existingProduct = await getProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    const updatedProduct = await updateProductService(productId, {
      nom,
      description,
      stock,
      status,
      prix,
    });

    return res.status(200).json({
      message: "Produit mis à jour avec succès",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit:", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la mise à jour du produit",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ message: "Token invalide ou manquant" });
  }

  if (verified.admin != 1) {
    return res.status(403).json({
      message: "Vous n'avez pas l'autorisation pour supprimer un produit",
    });
  }

  try {
    const productId = req.params.id;

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    const medias = existingProduct.medias;
    const mediaUrls = [...medias.imageUrls, ...medias.videoUrls];

    await connectSFTP();

    for (const mediaUrl of mediaUrls) {
      try {
        const filename = mediaUrl.split("/").pop();

        const mediaType = mediaUrl.includes("/images/") ? "images" : "videos";

        const filePath = `/var/www/medias/${mediaType}/products/${filename}`;

        const deleteResult = await deleteFileToVPS(filePath);
        if (deleteResult.success) {
          console.log(`Fichier supprimé avec succès: ${filePath}`);
        } else {
          console.error(
            `Erreur lors de la suppression du fichier ${filePath}:`,
            deleteResult.message
          );
        }
      } catch (err) {
        console.error(
          `Erreur lors de la suppression du fichier ${mediaUrl}:`,
          err
        );
      }
    }

    await Product.destroy({
      where: { id: productId },
    });

    await disconnectSFTP();

    return res.status(200).json({
      message: "Produit et fichiers associés supprimés avec succès",
      deletedFiles: mediaUrls,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du produit:", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la suppression du produit",
      error: error.message,
    });
  } finally {
    try {
      await disconnectSFTP();
    } catch (err) {
      console.error("Erreur lors de la déconnexion SFTP:", err);
    }
  }
};

export const likeProduct = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ message: "Token invalide ou manquant" });
  }

  const userId = verified.userId;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "Le productId est requis" });
  }

  try {
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    const existingFavorite = await Favorite.findOne({
      where: { userId: userId, productId: productId },
    });

    if (existingFavorite) {
      return res.status(400).json({
        message: "Vous ne pouvez pas liker plusieurs fois le même article.",
      });
    }

    const favorite = await Favorite.create({
      userId: userId,
      productId: productId,
    });

    await Product.update(
      { favorites: product.favorites + 1 },
      { where: { id: productId } }
    );

    return res.status(201).json({
      message: "Produit ajouté aux favoris avec succès",
      favorite: favorite,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout aux favoris:", error);
    return res.status(500).json({
      message: "Erreur serveur lors de l'ajout aux favoris",
      error: error.message,
    });
  }
};

export const unlikeProduct = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ message: "Token invalide ou manquant" });
  }

  const userId = verified.userId;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "Le productId est requis" });
  }

  try {
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    const existingFavorite = await Favorite.findOne({
      where: { userId: userId, productId: productId },
    });

    if (!existingFavorite) {
      return res
        .status(400)
        .json({ message: "Vous n'avez pas encore liké ce produit." });
    }

    await Favorite.destroy({
      where: { userId: userId, productId: productId },
    });

    await Product.update(
      { favorites: product.favorites - 1 },
      { where: { id: productId } }
    );

    return res.status(200).json({
      message: "Produit retiré des favoris avec succès",
    });
  } catch (error) {
    console.error("Erreur lors du retrait des favoris:", error);
    return res.status(500).json({
      message: "Erreur serveur lors du retrait des favoris",
      error: error.message,
    });
  }
};

export const getAllFavoritesByUserId = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token manquant." });
  }

  const verified = verifyToken(token);

  if (!verified) {
    return res.status(401).json({ message: "Token invalide." });
  }

  const userId = verified.userId;

  try {
    const favorites = await Favorite.findAll({ where: { userId } });

    if (!favorites || favorites.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun favori trouvé pour cet utilisateur." });
    }

    const products = await Promise.all(
      favorites.map(async (favorite) => {
        const product = await Product.findByPk(favorite.productId);
        if (!product) {
          console.warn(`Produit non trouvé pour l'ID: ${favorite.productId}`);
          return null;
        }
        return product.toJSON();
      })
    );

    const filteredProducts = products.filter((product) => product !== null);

    return res.status(200).json({
      favorites: filteredProducts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
