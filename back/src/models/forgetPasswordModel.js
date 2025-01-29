// models/ForgetPassword.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const ForgetPassword = sequelize.define(
  "forgetpassword",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    code: {
      type: DataTypes.STRING(255),
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
    tableName: "forgetpassword",
    timestamps: true,
  }
);

export default ForgetPassword;
