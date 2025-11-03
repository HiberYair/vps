// controllers/userController.js

const User = require('../models/User'); 
const bcrypt = require('bcryptjs'); 

// @desc    Crear un nuevo usuario (ADMIN)
// @route   POST /users/
// @access  Private (Admin: bob)
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
        // Si tu modelo NO tiene un hook pre-save para hashear, la línea de abajo es un punto de vulnerabilidad.
        // Asumiendo que tu modelo lo hashea automáticamente o que lo harías aquí.
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
// @access  Private (Admin: bob)
exports.listUsers = async (req, res) => {
    try {
        // Excluir la contraseña y otros campos innecesarios
        const users = await User.find().select('-password -__v -createdAt -updatedAt'); 
        res.json(users);
    } catch (error) {
        console.error('Error al obtener lista de usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// @desc    Actualizar email o contraseña de un usuario (ADMIN)
// @route   PUT /users/:id
// @access  Private (Admin: bob)
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
        
        // 1. Actualizar Email (si se proporciona)
        if (email) {
            user.email = email;
        }

        // 2. Actualizar Contraseña (si se proporciona)
        // CRUCIAL: Solo asignamos el texto plano. El hook 'pre-save' del modelo
        // se encargará de hashearlo si es que se modificó.
        if (password) {
            user.password = password; // <--- Cambiado a la asignación de texto plano
        }
        
        // Al llamar save(), se disparará el hook 'pre-save' en models/User.js
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
// @access  Private (Admin: bob)
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