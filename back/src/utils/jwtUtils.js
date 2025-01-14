import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET =
  "f3c1e2d3b4a5c6d7e8f9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1";

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d", // Le token expire après 1 jour
    algorithm: "HS256",
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch (error) {
    console.error("Erreur lors de la vérification du token:", error.message);
    return null;
  }
};

export { JWT_SECRET, generateToken, verifyToken };
