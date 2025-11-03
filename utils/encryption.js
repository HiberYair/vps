// utils/encryption.js
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Clave del .env
const iv = Buffer.alloc(16, 0); // Vector de inicialización estático por simplicidad

// Función para generar una clave de descifrado segura (Key para el cliente)
const generateDecryptionKey = () => {
    // Genera una clave aleatoria legible para el usuario (ej: 16 caracteres)
    return crypto.randomBytes(8).toString('hex'); 
}

// Cifrar un archivo (buffer)
const encryptFile = (buffer) => {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return encrypted;
};

// Descifrar un Buffer de datos
const decryptData = (encryptedBuffer) => {
    try {
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted;
    } catch (error) {
        // Esto captura errores como 'Bad decrypt' si la clave o los datos son incorrectos.
        console.error('Error en el módulo de descifrado:', error.message);
        throw new Error('Error de descifrado (Clave o datos incorrectos).');
    }
}


// Se usará para generar la clave de DESCARGA (DownloadToken)
const generateDownloadToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

module.exports = { 
    generateDecryptionKey, 
    encryptFile,
    decryptData, // <-- NUEVA EXPORTACIÓN
    generateDownloadToken 
};
