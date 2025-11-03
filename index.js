// index.js

// Cargar variables de entorno al inicio
require('dotenv').config(); 

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // Para verificar el token de Socket.IO

// IMPORTACIONES NECESARIAS PARA CHAT
const Message = require('./models/Message'); // <-- NUEVO: Para guardar en BD
const User = require('./models/User');     // <-- ASUMIDO: Para buscar el ID del recipient

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// Importaciones de rutas REST API
const fileRoutes = require('./routes/file'); 
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user'); 
const messageRoutes = require('./routes/message'); // <-- NUEVO: Para la ruta de historial


// ====================================================
// CONEXIÓN A LA BASE DE DATOS
// ====================================================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conexión a MongoDB exitosa.'))
    .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// ====================================================
// MIDDLEWARE DE EXPRESS
// ====================================================
app.use(helmet()); 
app.use(cors({
    origin: '*', // Cambiar por dominio específico en producción
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Configuración para permitir hasta 50MB en peticiones JSON.
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// ====================================================
// CONFIGURACIÓN DE SOCKET.IO PARA TIEMPO REAL
// ====================================================
const io = new Server(server, {
    cors: {
        origin: '*', 
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// MIDDLEWARE DE AUTENTICACIÓN PARA SOCKET.IO (JWT)
io.use((socket, next) => {
    const token = socket.handshake.auth.token; 
    if (!token) {
        return next(new Error('Authentication error: Token not provided')); 
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Asegúrate de que el JWT contiene al menos 'id' y 'username'
        socket.user = decoded; 
        next();
    } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
    }
});


io.on('connection', (socket) => {
    const userId = socket.user.id;
    const username = socket.user.username;

    console.log(`✅ Usuario autenticado y conectado: ${username} (ID: ${socket.id})`);
    
    // Une el socket a una sala única basada en su ID de MongoDB (CRUCIAL)
    socket.join(userId); 
    console.log(`Socket unido a la sala: ${userId}`);


    // LÓGICA DE ENVÍO Y PERSISTENCIA DE MENSAJES PRIVADOS
    socket.on('send_message', async (data) => { // <-- Se convierte en async
        const { recipientUsername, text } = data; // <-- Cambiado de recipientId a recipientUsername (más útil para el frontend)
        
        if (!recipientUsername || !text) {
            console.error('Datos incompletos para enviar mensaje.');
            return;
        }

        try {
            // 1. Convertir el username del destinatario a su ID de MongoDB
            const recipientUser = await User.findOne({ username: recipientUsername });

            if (!recipientUser) {
                console.error(`Destinatario no encontrado: ${recipientUsername}`);
                // Podrías emitir un error de vuelta al sender si lo deseas
                return; 
            }
            const recipientId = recipientUser._id.toString();


            // 2. Guardar el mensaje en la base de datos (Persistencia)
            const newMessage = await Message.create({
                sender: userId,
                recipient: recipientId,
                content: text,
            });

            const messagePayload = {
                id: newMessage._id, // Usamos el ID real de la BD
                text: text,
                senderId: userId,
                senderUsername: username,
                timestamp: newMessage.createdAt || new Date() // Usar el timestamp de la BD
            };
            
            console.log(`Mensaje de ${username} para ${recipientUsername}: "${text}"`);

            // 3. Envía el mensaje al RECEPTOR (a su sala basada en su ID)
            io.to(recipientId).emit('receive_message', messagePayload);
            
            // 4. Envía el mensaje de VUELTA al REMITENTE
            if (recipientId !== userId) {
                io.to(userId).emit('receive_message', messagePayload);
            }

        } catch (error) {
            console.error('Error al manejar y guardar el mensaje Socket:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Usuario desconectado: ${username}`);
    });
});


// ====================================================
// RUTAS REST (API)
// ====================================================

// Usar las rutas
app.use('/auth', authRoutes);
app.use('/users', userRoutes); 
app.use('/files', fileRoutes); 
app.use('/messages', messageRoutes); // <-- ¡NUEVA RUTA DE MENSAJES! (Solo para Historial)


// Ruta principal simple
app.get('/', (req, res) => {
    res.send('Servidor de mensajería Express está funcionando.');
});


// ====================================================
// INICIAR EL SERVIDOR
// ====================================================
server.listen(port, () => {
    console.log(`Servidor iniciado en el puerto: ${port}`);
});