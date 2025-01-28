import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import Stripe from "stripe";

// Charger les variables d'environnement à partir du fichier .env
dotenv.config();

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configuration de la connexion à la base de données
const sequelize = new Sequelize({
  dialect: "mysql",
  host: "37.187.225.41",
  username: "admin",
  password: "PestControl33",
  database: "pestcontrol",
  logging: false,
  port: 3306,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Tester la connexion
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error("Erreur de connexion à la base de données:", error);
    return false;
  }
};

// Vérifier périodiquement la connexion
const checkDatabaseConnection = async () => {
  const isConnected = await connectDatabase();
  if (isConnected) {
    console.log("La connexion à la base de données est fonctionnelle");
  } else {
    console.error("La connexion à la base de données a échoué");
  }
};

// Vérifier la connexion toutes les 60 minutes
setInterval(checkDatabaseConnection, 69 * 60 * 1000);

// Vérifier la connexion au démarrage
checkDatabaseConnection();

// Exporter les instances
export { sequelize, connectDatabase, checkDatabaseConnection, stripe };
