const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // O el que uses
    auth: {
        user: process.env.EMAIL_SERVICE_USER,
        pass: process.env.EMAIL_SERVICE_PASS
    }
});

/**
 * Envía la clave de descifrado por correo electrónico.
 * NOTA: Se ha eliminado el argumento downloadUrl. El destinatario 
 * debe obtener el archivo cifrado por otros medios (ej: mensajería).
 */
const sendDecryptionKey = async (recipientEmail, senderUsername, decryptionKey) => {
    const mailOptions = {
        from: process.env.EMAIL_SERVICE_USER,
        to: recipientEmail,
        subject: `Documento Seguro Cifrado de ${senderUsername}`,
        html: `
            <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333;">Notificación de Archivo Cifrado</h2>
                <p>Hola,</p>
                <p><strong>${senderUsername}</strong> te ha enviado un documento. Para garantizar la seguridad, el archivo está cifrado.</p>
                
                <p>Usa la siguiente clave para **descifrar localmente** el archivo una vez que lo hayas recibido:</p>
                
                <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
                    <h3 style="margin: 0; color: #d9534f; font-size: 24px;">Clave de Descifrado:</h3>
                    <code style="display: inline-block; padding: 8px 15px; background-color: #fff; border: 1px dashed #ccc; font-size: 18px; color: #000; letter-spacing: 1px;">
                        ${decryptionKey}
                    </code>
                </div>
                
                <p><strong>Instrucciones:</strong></p>
                <ol>
                    <li>Descarga el archivo cifrado (archivo con extensión **.enc**) que te fue enviado por separado.</li>
                    <li>Accede a la interfaz de descifrado e introduce esta clave para acceder al contenido original.</li>
                </ol>

                <p style="margin-top: 30px; font-size: 12px; color: #999;">Esta es la única forma de acceder al contenido seguro. No compartas esta clave.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email enviado con éxito a ${recipientEmail}`);
        return true;
    } catch (error) {
        console.error('Error al enviar email:', error);
        return false;
    }
};

module.exports = { sendDecryptionKey };
