import { sequelize } from "../config/database.js";
import { DataTypes } from "sequelize";

const User = sequelize.define(
  "utilisateurs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
        notEmpty: { msg: "Le prénom est requis" },
      },
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
        notEmpty: { msg: "Le nom de famille est requis" },
      },
    },
    pseudo: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
        isEmail: { msg: "L'adresse email n'est pas valide" },
        notEmpty: { msg: "L'adresse email est requise" },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [6, 100],
          msg: "Le mot de passe doit contenir au moins 6 caractères",
        },
      },
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    admin: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    adresse: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ville: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    codePostale: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pays: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    temp: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Utilisateurs",
  }
);

User.findByEmail = async function (email) {
  return await this.findOne({
    where: { email: email },
  });
};

User.findById = async function (userid) {
  return await this.findOne({
    where: { id: userid },
  });
};

export default User;
