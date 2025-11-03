// test_email.js

require('dotenv').config(); // Carga las variables de .env

const nodemailer = require('nodemailer');

// ⚠️ Usa una cuenta de correo REAL a donde quieres enviar la prueba
const TEST_RECIPIENT = 'hambrociol@gmail.com'; 

// 1. Configuración del transportador (SMTP)
const transporter = nodemailer.createTransport({
    // Usa el servicio que configuraste (Gmail es el más común)
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_SERVICE_USER, // Tu correo del .env
        pass: process.env.EMAIL_SERVICE_PASS  // Tu contraseña o App Password del .env
    }
});

// 2. Opciones del correo
const mailOptions = {
    from: process.env.EMAIL_SERVICE_USER,
    to: TEST_RECIPIENT,
    subject: '✅ PRUEBA EXITOSA: Nodemailer Funciona',
    text: 'Si recibes este correo, ¡tu configuración de Nodemailer es correcta!',
    html: '<b>Si recibes este correo, ¡tu configuración de Nodemailer es correcta!</b>'
};

// 3. Envío del correo
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('❌ ERROR al enviar el correo de prueba. Posibles causas:');
        console.error(error);
        
        // Muestra la causa específica del fallo
        if (error.code === 'EENVELOPE' || error.responseCode === 535) {
            console.error('\n⚠️ Posiblemente la APP PASSWORD o las credenciales son incorrectas.');
            console.error('O el "Acceso de aplicaciones menos seguras" está deshabilitado si usas Gmail.');
        }

    } else {
        console.log('✅ Correo de prueba enviado con éxito.');
        console.log('ID del mensaje:', info.messageId);
        console.log(`Revisa la bandeja de entrada de ${TEST_RECIPIENT}`);
    }
});