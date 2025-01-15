import SubCategory from "../models/subCategoriesModel.js";

export const createSubCategory = async (Data) => {
  try {
    const newSubCategory = await SubCategory.create(Data);
    return newSubCategory;
  } catch (error) {
    throw new Error("Erreur lors de la création du produit: " + error.message);
  }
};
