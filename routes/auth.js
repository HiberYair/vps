const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Importa el modelo de usuario

// Función para generar un JWT (JSON Web Token)
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET, // Usa la clave secreta de tu .env
        { expiresIn: '1d' }      // El token expira en 1 día
    );
};

// ===================================
// RUTA 1: REGISTRO DE NUEVO USUARIO
// ===================================
router.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Se requiere nombre de usuario y contraseña.' });
    }

    try {
        // 1. Verificar si el usuario ya existe
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'El nombre de usuario ya está en uso.' });
        }

        // 2. Crear y guardar el nuevo usuario
        // Nota: La contraseña se hashea automáticamente en el hook 'pre-save' del modelo User.js
        const newUser = new User({ username, password, email });
        await newUser.save();

        // 3. Generar y enviar el token
        const token = generateToken(newUser);
        res.status(201).json({ 
            message: 'Registro exitoso.', 
            user: { id: newUser._id, username: newUser.username },
            token 
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// ===================================
// RUTA 2: INICIO DE SESIÓN (LOGIN)
// ===================================
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Buscar el usuario
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 2. Comparar la contraseña (usando el método del modelo User.js)
        const isMatch = await user.isValidPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 3. Generar y enviar el token
        const token = generateToken(user);
        res.status(200).json({ 
            message: 'Inicio de sesión exitoso.', 
            user: { id: user._id, username: user.username },
            token 
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;