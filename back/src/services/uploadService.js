import SftpClient from "ssh2-sftp-client";

const sftp = new SftpClient();

export const connectSFTP = async () => {
  await sftp.connect({
    host: "37.187.225.41",
    port: "22",
    username: "ubuntu",
    password: "Lacoste33710?",
  });
};

export const uploadFileToVPS = async (file, productId, index) => {
  const mediaType = file.mimetype.startsWith("image/") ? "IMAGES" : "VIDEOS";

  // Générer un identifiant aléatoire
  const randomIdBefore = Math.floor(10000000 + Math.random() * 90000000); // Génère un nombre aléatoire à 8 chiffres
  const randomIdAfter = Math.floor(100000 + Math.random() * 900000); // Génère un nombre aléatoire à 6 chiffres

  const extension = file.originalname.split(".").pop();

  const newFileName = `${randomIdBefore}_${productId}_${index}_${randomIdAfter}.${extension}`;
  const remotePath = `/var/www/medias/${mediaType}/${newFileName}`;

  try {
    await sftp.put(file.buffer, remotePath);
    return { success: true, filename: newFileName };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const disconnectSFTP = async () => {
  await sftp.end();
};
