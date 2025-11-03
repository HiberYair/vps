// controllers/messageController.js

const Message = require('../models/Message');
const User = require('../models/User'); // Asumido: Necesario para buscar al destinatario
const bcrypt = require('bcryptjs');

// @desc    Obtener el historial de mensajes con un usuario dado
// @route   GET /messages/history?recipient=nombredeusuario
// @access  Private 
exports.createUser = async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }

    try {
        let user = await User.findOne({ $or: [{ username }, { email }] });
        if (user) {
            return res.status(400).json({ message: 'El nombre de usuario o email ya están en uso.' });
        }
        
        user = new User({ username, password, email });
        // NOTA: La contraseña debe hashearse en un hook 'pre-save' de tu modelo User.
        await user.save();

        res.status(201).json({ 
            message: 'Usuario creado exitosamente.',
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// @desc    Obtener lista de todos los usuarios (ADMIN)
// @route   GET /users/
// @access  Private (Admin)
exports.listUsers = async (req, res) => {
    try {
        // Excluir la contraseña al listar por seguridad
        const users = await User.find().select('-password -__v -createdAt -updatedAt'); 
        res.json(users);
    } catch (error) {
        console.error('Error al obtener lista de usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// @desc    Actualizar email o contraseña de un usuario (ADMIN)
// @route   PUT /users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
    const { email, password } = req.body;
    const { id } = req.params; 

    if (!email && !password) {
        return res.status(400).json({ message: 'Se requiere email o contraseña para actualizar.' });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        
        // 1. Actualizar Email
        if (email) {
            user.email = email;
        }

        // 2. Actualizar Contraseña (DEBE ser hasheada)
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }
        
        await user.save(); 

        res.json({ 
            message: 'Usuario actualizado exitosamente.', 
            user: { id: user._id, username: user.username, email: user.email }
        });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// @desc    Eliminar un usuario por ID (ADMIN)
// @route   DELETE /users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const userToDelete = await User.findById(id);

        if (!userToDelete) {
             return res.status(404).json({ message: 'Usuario no encontrado para eliminar.' });
        }
        
        // Prevención: El admin 'bob' no puede borrarse a sí mismo
        if (userToDelete.username === 'bob') {
             return res.status(403).json({ message: 'No puedes eliminar al usuario administrador (bob).' });
        }

        await User.findByIdAndDelete(id);

        res.json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

exports.getHistory = async (req, res) => {
    // CRUCIAL: Tu middleware adjunta la información del token a req.user.
    // Usaremos 'id' por ser el estándar en tokens.
    const currentUserId = req.user.id; 
    const recipientUsername = req.query.recipient; 

    if (!recipientUsername) {
        return res.status(400).json({ message: 'Se requiere el parámetro "recipient".' });
    }

    try {
        // 1. Obtener el ID del destinatario
        const recipientUser = await User.findOne({ username: recipientUsername });

        if (!recipientUser) {
            return res.status(404).json({ message: 'El usuario destinatario no fue encontrado.' });
        }
        
        const recipientId = recipientUser._id;

        // 2. Buscar mensajes en ambas direcciones
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: recipientId },
                { sender: recipientId, recipient: currentUserId }
            ]
        })
        .sort({ createdAt: 1 }) 
        .populate('sender', 'username') 
        .exec();

        // 3. Formatear la respuesta
        const formattedMessages = messages.map(msg => ({
            id: msg._id,
            sender: msg.sender.username, 
            content: msg.content,
            timestamp: msg.createdAt, 
        }));

        res.status(200).json({ 
            messages: formattedMessages
        });

    } catch (error) {
        console.error('Error al obtener el historial de mensajes:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el historial.' });
    }
};


// =================================================================
// 🚀 NUEVA FUNCIÓN: ENVÍO DE MENSAJES (Implementación faltante)
// =================================================================

// @desc    Enviar un nuevo mensaje
// @route   POST /messages/send
// @access  Private 
exports.sendMessage = async (req, res) => {
    // El ID del usuario actual viene del token JWT (middleware/auth.js)
    const currentUserId = req.user.id; 
    
    // El destinatario y el contenido vienen del cuerpo de la solicitud (frontend)
    const { recipientUsername, content } = req.body; 

    if (!recipientUsername || !content) {
        return res.status(400).json({ message: 'Se requieren el destinatario y el contenido del mensaje.' });
    }

    try {
        // 1. Obtener el ID del destinatario por su username
        const recipientUser = await User.findOne({ username: recipientUsername });

        if (!recipientUser) {
            return res.status(404).json({ message: 'El usuario destinatario no fue encontrado.' });
        }
        
        // 2. Crear y guardar el nuevo mensaje
        const newMessage = new Message({
            sender: currentUserId,
            recipient: recipientUser._id,
            content: content
        });

        await newMessage.save();

        // 3. Respuesta de éxito (incluye el username del remitente para el frontend)
        res.status(201).json({ 
            message: 'Mensaje enviado exitosamente',
            sentMessage: {
                id: newMessage._id,
                sender: req.user.username, // Asumiendo que el payload del token tiene el 'username'
                content: newMessage.content,
                timestamp: newMessage.createdAt,
            }
        });

    } catch (error) {
        console.error('Error al enviar el mensaje:', error);
        res.status(500).json({ message: 'Error interno del servidor al enviar el mensaje.' });
    }
};