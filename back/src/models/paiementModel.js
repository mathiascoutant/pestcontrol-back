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
  },
  {
    tableName: "paiements",
    timestamps: true,
  }
);

export default Paiements;
