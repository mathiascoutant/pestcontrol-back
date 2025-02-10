import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Paiements = sequelize.define(
  "paiements",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    products: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    invoice: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currency: {
      // Nouvelle colonne pour la devise
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    payment_type: {
      // Nouvelle colonne pour le type de paiement
      type: DataTypes.STRING(10),
      allowNull: false,
    },
  },
  {
    tableName: "paiements",
    timestamps: true,
  }
);

export default Paiements;
