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

export const uploadFileToVPS = async (file, Id, index, type, destination) => {
  // Générer un identifiant aléatoire
  const randomIdBefore = Math.floor(10000000 + Math.random() * 90000000);
  const randomIdAfter = Math.floor(100000 + Math.random() * 900000);

  const extension = file.originalname.split(".").pop();

  const remotePath = `/var/www/medias/${type}/${destination}/${randomIdBefore}_${Id}_${index}_${randomIdAfter}.${extension}`; // Chemin distant

  try {
    await sftp.put(file.buffer, remotePath);
    return {
      success: true,
      filename: `${randomIdBefore}_${Id}_${index}_${randomIdAfter}.${extension}`,
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const deleteFileToVPS = async (filePath) => {
  try {
    await sftp.delete(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const disconnectSFTP = async () => {
  await sftp.end();
};
