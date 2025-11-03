// routes/message.js

const express = require('express');
const authMiddleware = require('../middleware/auth'); 
// AHORA IMPORTAMOS AMBAS FUNCIONES DESDE EL CONTROLADOR
const { getHistory, sendMessage } = require('../controllers/messageController'); 

const router = express.Router();

// 1. RUTA EXISTENTE: GET /messages/history?recipient=nombredeusuario 
router.get('/history', authMiddleware, getHistory);

// 2. 🚀 NUEVA RUTA: POST /messages/send <--- ¡LA RUTA QUE FALTABA!
router.post('/send', authMiddleware, sendMessage);

module.exports = router;