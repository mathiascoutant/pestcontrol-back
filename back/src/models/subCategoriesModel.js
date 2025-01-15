import { sequelize } from "../config/database.js"; // Assurez-vous que le chemin est correct
import { DataTypes } from "sequelize";

const SubCategory = sequelize.define(
  "subCategories",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
    },
  },
  {
    sequelize,
    modelName: "subCategories",
  }
);

export default SubCategory;
