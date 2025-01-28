import express from "express";
import https from "https";
import fs from "fs";
import { connectDatabase } from "./src/config/database.js";

const app = express();
const port = 3002;

const checkServerStatus = () => {
  const currentTime = new Date().toLocaleString(); // Récupérer l'heure actuelle
  console.log(`Vérification de l'état du serveur à ${currentTime}`);
  // Vous pouvez ajouter d'autres vérifications ici, par exemple, vérifier la connexion à la base de données
};

// Middleware et routes ici
app.get("/", (req, res) => {
  res.send("Hello from Node.js backend!");
});

// Options SSL
const options = {
  key: fs.readFileSync("/etc/letsencrypt/live/pestcontrol33.com/privkey.pem"),
  cert: fs.readFileSync(
    "/etc/letsencrypt/live/pestcontrol33.com/fullchain.pem"
  ),
};

async function startServer() {
  try {
    await connectDatabase();

    // Démarrer le serveur HTTPS
    https.createServer(options, app).listen(port, () => {
      const currentTime = new Date().toLocaleString(); // Récupérer l'heure actuelle
      console.log(
        `Serveur démarré sur https://localhost:${port} le ${currentTime}`
      );
      // Vérifier l'état du serveur toutes les heures (3600000 ms)
      setInterval(checkServerStatus, 3600000);
    });
  } catch (error) {
    console.error("Erreur lors du démarrage du serveur:", error);
    process.exit(1);
  }
}

startServer();
