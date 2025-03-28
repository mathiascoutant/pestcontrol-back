import Discount from "../models/discountProductsModel.js";
import Product from "../models/productModel.js";

export const createDiscount = async ({
  productId,
  discount,
  newPrice,
  startDate,
  endDate,
}) => {
  const newDiscount = await Discount.create({
    productId,
    discount,
    newPrice,
    startDate,
    endDate,
  });

  return newDiscount;
};

export const updateDiscount = async ({
  discountId,
  productId,
  discount,
  startDate,
  endDate,
}) => {
  const existingDiscount = await Discount.findByPk(discountId);
  if (!existingDiscount) {
    throw new Error("Discount non trouvé.");
  }

  const product = await Product.findByPk(productId);
  if (!product) {
    throw new Error("Produit non trouvé.");
  }

  const basePrice = product.prix;
  const newPrice = basePrice - basePrice * (discount / 100);

  existingDiscount.productId = productId;
  existingDiscount.discount = discount;
  existingDiscount.newPrice = newPrice;
  existingDiscount.startDate = startDate;
  existingDiscount.endDate = endDate;

  await existingDiscount.save();

  return existingDiscount;
};

export const deleteDiscount = async (discountId) => {
  const existingDiscount = await Discount.findByPk(discountId);
  if (!existingDiscount) {
    throw new Error("Discount non trouvé.");
  }

  await Discount.destroy({ where: { id: discountId } });
  return { message: "Discount supprimé avec succès." };
};

/**
 * Récupère toutes les réductions pour un produit spécifique
 * @param {number} productId - L'ID du produit
 * @returns {Promise<Array>} - Liste des réductions pour ce produit
 */
export const getDiscountsByProductId = async (productId) => {
  try {
    const discounts = await Discount.findAll({
      where: { productId: productId },
    });
    return discounts;
  } catch (error) {
    throw new Error(
      `Erreur lors de la récupération des réductions: ${error.message}`
    );
  }
};
