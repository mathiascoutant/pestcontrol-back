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
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    urlInvoice: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isReduction: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    reductionFunction: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    reductionAmount: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fraisTransport: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    tableName: "paiements",
    timestamps: true,
  }
);

export default Paiements;
