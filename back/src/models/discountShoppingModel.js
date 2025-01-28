import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const DiscountShopping = sequelize.define(
  "discountShopping",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discount: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    multiUsage: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    nbrAutorisationUsage: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    nbrUsed: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fonction: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      onUpdate: DataTypes.NOW,
    },
  },
  {
    tableName: "discountShopping",
    timestamps: true,
  }
);

export default DiscountShopping;
