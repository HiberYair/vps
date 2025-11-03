const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const FileModel = require('../models/File');
const User = require('../models/User');
const {
    encryptFile,
    generateDecryptionKey,
    generateDownloadToken,
    decryptData
} = require('../utils/encryption');
const { sendDecryptionKey } = require('../utils/mailer');
const fsSync = require('fs'); 

// Directorio para archivos cifrados
const ENCRYPTED_DIR = path.join(__dirname, '..', 'encrypted_files');
fs.mkdir(ENCRYPTED_DIR, { recursive: true }).catch(err => {
    console.error("Error al asegurar el directorio de archivos cifrados:", err);
});

// Configuración de Multer (Solo para /upload)
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }
});

// =======================================================
// RUTA POST: Subida, Cifrado y Notificación
// =======================================================
router.post('/upload', authMiddleware, upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se adjuntó ningún archivo.' });
    }

    const { recipientUsername } = req.body;

    if (!recipientUsername) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: 'Se requiere el nombre de usuario del destinatario.' });
    }

    let recipient = null;
    try {
        const uploaderId = req.user.id;

        recipient = await User.findOne({ username: recipientUsername });

        if (!recipient) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ message: 'Destinatario no encontrado.' });
        }

        if (!recipient.email) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ message: 'El destinatario no tiene un correo electrónico registrado para la notificación.' });
        }

        const fileBuffer = await fs.readFile(req.file.path);
        const encryptedBuffer = encryptFile(fileBuffer);

        const decryptionKey = generateDecryptionKey();
        const downloadToken = generateDownloadToken();
        const encryptedFileName = `${downloadToken}.enc`;
        const encryptedFilePath = path.join(ENCRYPTED_DIR, encryptedFileName);

        await fs.writeFile(encryptedFilePath, encryptedBuffer);
        await fs.unlink(req.file.path).catch(() => {});

        const fileRecord = new FileModel({
            originalName: req.file.originalname,
            encryptedPath: encryptedFilePath,
            fileMimeType: req.file.mimetype,
            decryptionKey: decryptionKey,
            downloadToken: downloadToken,
            uploaderId: uploaderId,
            recipientId: recipient._id
        });
        await fileRecord.save();

        await sendDecryptionKey(
            recipient.email,
            req.user.username,
            decryptionKey
        );

        res.status(200).json({
            message: 'Documento cifrado y notificado con éxito. ¡La clave fue generada y enviada por correo!',
            decryptionKey: decryptionKey
        });

    } catch (error) {
        console.error('Error en el proceso de carga:', error);
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ message: 'Error interno del servidor durante el cifrado.' });
    }
});

// =======================================================
// RUTA GET: Obtener Bandeja de Entrada del Destinatario
// =======================================================
router.get('/inbox', authMiddleware, async (req, res) => {
    try {
        const recipientId = req.user.id;

        const pendingFiles = await FileModel.find({
            recipientId: recipientId,
            isDownloaded: false
        })
        .select('originalName downloadToken createdAt');

        if (pendingFiles.length === 0) {
            return res.status(200).json({
                message: 'Tu bandeja de entrada está vacía. No tienes archivos pendientes de descarga.',
                files: []
            });
        }

        const filesForClient = pendingFiles.map(file => ({
            fileId: file.downloadToken, // Usar downloadToken como 'fileId' para el frontend
            originalName: file.originalName,
            dateSent: file.createdAt
        }));

        res.status(200).json({
            message: `Tienes ${filesForClient.length} archivos pendientes.`,
            files: filesForClient
        });

    } catch (error) {
        console.error('Error al obtener la bandeja de entrada:', error);
        res.status(500).json({ message: 'Error interno del servidor al buscar archivos pendientes.' });
    }
});

// =======================================================
// RUTA GET: Descarga AUTORIZADA (con authMiddleware) 👈 LÓGICA DE BORRADO AÑADIDA AQUÍ
// =======================================================
router.get('/download-encrypted/:token', authMiddleware, async (req, res) => {
    const { token } = req.params;
    const recipientId = req.user.id; 

    let fileRecord;

    try {
        // 1. Buscar el archivo
        fileRecord = await FileModel.findOne({
            downloadToken: token,
            recipientId: recipientId,
            isDownloaded: false // Aseguramos que no haya sido marcado como descargado
        });

        if (!fileRecord) {
            return res.status(404).json({
                message: 'Archivo cifrado no encontrado o acceso denegado.'
            });
        }

        // 2. Verificar existencia en disco
        if (!fsSync.existsSync(fileRecord.encryptedPath)) {
             console.error(`🚨 Archivo no encontrado en disco, ruta: ${fileRecord.encryptedPath}`);
             return res.status(404).json({
                message: 'El archivo ya fue descargado y eliminado del servidor.'
            });
        }
        
        // 3. Marcar como descargado ANTES de la transmisión
        await FileModel.updateOne({ _id: fileRecord._id }, { isDownloaded: true });

        // 4. Descargar el archivo cifrado
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}.enc"`);

        const encryptedFileStream = fsSync.createReadStream(fileRecord.encryptedPath);
        encryptedFileStream.pipe(res);

        // 5. Lógica de limpieza al finalizar el stream (¡NUEVO!)
        encryptedFileStream.on('close', async () => {
             // Solo se ejecuta si el stream se cerró con éxito
             try {
                 await fs.unlink(fileRecord.encryptedPath);
                 await FileModel.deleteOne({ _id: fileRecord._id });
                 console.log(`✅ Archivo y registro borrados automáticamente por descarga autorizada: ${fileRecord.originalName}`);
             } catch (cleanupError) {
                 console.error('Error al borrar archivo después de la descarga autorizada:', cleanupError);
             }
         });

        encryptedFileStream.on('error', (err) => {
            console.error('Error durante la transmisión del archivo cifrado:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error en la transmisión del archivo.' });
            }
        });

    } catch (error) {
        console.error('Error en la descarga autorizada:', error);
        // Si hay un error *antes* de que se envíen los headers
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error interno del servidor durante la descarga.' });
        }
    }
});

// =======================================================
// RUTA POST: DESCIFRADO DEL ARCHIVO
// =======================================================
router.post('/decrypt', authMiddleware, async (req, res) => {
    const { encryptedFileData, decryptionKey, originalName } = req.body;

    if (!encryptedFileData || !decryptionKey || !originalName) {
        return res.status(400).json({ message: 'Datos incompletos para el descifrado: Se requiere el archivo, la clave y el nombre original.' });
    }

    try {
        const encryptedBuffer = Buffer.from(encryptedFileData, 'base64');
        const decryptedBuffer = decryptData(encryptedBuffer, decryptionKey);

        const decryptedBase64 = decryptedBuffer.toString('base64');

        res.status(200).json({
            message: 'Archivo descifrado con éxito en el servidor.',
            fileName: originalName,
            fileData: decryptedBase64
        });

    } catch (error) {
        console.error('Error durante el descifrado en el servidor:', error.message);
        res.status(400).json({
            message: 'Error de descifrado: La clave es incorrecta o los datos están corruptos.',
            error: error.message
        });
    }
});


// =======================================================
// RUTA GET: Descarga única y borrado automático (Link de un solo uso)
// Esta ruta también tiene la lógica de borrado.
// =======================================================
router.get('/download/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const fileRecord = await FileModel.findOne({ downloadToken: token, isDownloaded: false });

        if (!fileRecord) {
            return res.status(404).json({
                message: 'Archivo no encontrado o ya fue descargado. El enlace es de un solo uso.'
            });
        }

        await FileModel.updateOne({ _id: fileRecord._id }, { isDownloaded: true });

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}.enc"`);

        const encryptedFileStream = fsSync.createReadStream(fileRecord.encryptedPath);
        encryptedFileStream.pipe(res);

        encryptedFileStream.on('close', async () => {
            try {
                // Borrado y limpieza después de la descarga
                await fs.unlink(fileRecord.encryptedPath);
                await FileModel.deleteOne({ _id: fileRecord._id });
                console.log(`✅ Archivo y registro borrados automáticamente: ${fileRecord.originalName}`);
            } catch (cleanupError) {
                console.error('Error al borrar archivo después de la descarga:', cleanupError);
            }
        });

        encryptedFileStream.on('error', (err) => {
            console.error('Error durante la transmisión del archivo cifrado:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error en la transmisión del archivo.' });
            }
        });

    } catch (error) {
        console.error('Error en el proceso de descarga:', error);
        res.status(500).json({ message: 'Error interno del servidor durante la descarga.' });
    }
});

module.exports = router;