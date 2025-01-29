import nodemailer from "nodemailer";

export const sendContactEmail = async (req, res) => {
  try {
    const { to, subject, text, email } = req.body;

    if (!to || !subject || !text || !email) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires (to, subject, text, email)",
      });
    }

    const transporter = nodemailer.createTransport({
      host: "vps-f81ba1bf.vps.ovh.net", 
      port: 587, 
      secure: false,
      auth: {
        user: "admin@pestcontrol33.com", 
        pass: "Lacoste33710?",
      },
      debug: true,
      tls: {
        rejectUnauthorized: false, 
      },
    });

    const mailOptions = {
      from: '"PestControl33" <technique@pestcontrol33.com>',
      to: to, 
      subject: `[Contact] ${subject}`, 
      html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
              <h2 style="color: #4CAF50;">Nouveau message de contact</h2>
              <p style="font-size: 16px;">Vous avez reçu un nouveau message depuis la page de contact de votre site internet.</p>
              <hr style="border: 1px solid #4CAF50;">
              <h3 style="color: #4CAF50;">Détails du contact :</h3>
              <p><strong>Email :</strong> ${email}</p>
              <p><strong>Message :</strong></p>
              <p style="background-color: #f9f9f9; padding: 10px; border-left: 4px solid #4CAF50;">${text}</p>
          </div>
      `, 
    };

    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Email envoyé avec succès",
      response: info.response,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return res.status(500).json({
      message: "Erreur lors de l'envoi de l'email",
      error: error.message,
    });
  }
};
