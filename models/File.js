// models/File.js

const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    originalName: { type: String, required: true },
    encryptedPath: { type: String, required: true }, // Ruta donde se guardó el archivo cifrado
    fileMimeType: { type: String, required: true },

    // Clave de descifrado (la que se envía al destinatario)
    decryptionKey: { type: String, required: true }, 

    // Clave de descarga única (token de un solo uso)
    downloadToken: { type: String, required: true, unique: true }, 
    
    // ID del usuario que subió el archivo
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // ID del usuario destinatario
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    isDownloaded: { type: Boolean, default: false }, // Para descarga única
    createdAt: { type: Date, default: Date.now, expires: 60*60*24*7 } // Opcional: auto-borrar después de 7 días
});

module.exports = mongoose.model('File', FileSchema);