import { app } from "./app.js";
import { connectDatabase } from "./src/config/database.js";

const PORT = 3003;

const checkServerStatus = () => {
  const currentTime = new Date().toLocaleString();
  console.log(`Vérification de l'état du serveur à ${currentTime}`);
};

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      const currentTime = new Date().toLocaleString();
      console.log(
        `Serveur démarré sur http://localhost:${PORT} le ${currentTime}`
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
