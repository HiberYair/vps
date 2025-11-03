const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Importa el middleware de protección
const userController = require('../controllers/userController');
const adminAuth = require('../middleware/adminAuth'); // IMPORTA EL NUEVO MIDDLEWARE
// ===================================
// RUTA PROTEGIDA: Obtener la lista de usuarios (simulado)
// ===================================
router.get('/me', authMiddleware, (req, res) => {
    // Esta ruta solo se ejecuta si el token es VÁLIDO.
    
    // Podemos acceder a la información del usuario gracias al middleware:
    const userId = req.user.id; 
    const username = req.user.username;
    
    res.json({
        message: '¡Acceso autorizado! Eres un usuario logueado.',
        data: {
            // En una app real, aquí buscarías los datos del usuario por userId
            user: { id: userId, username: username } 
        }
    });
});

// Rutas de Administración (CRUD) - Requieren ser 'bob'

// GET /users/ - Listar todos los usuarios
router.get('/', authMiddleware, adminAuth, userController.listUsers); 

// POST /users/ - Crear un nuevo usuario
router.post('/', authMiddleware, adminAuth, userController.createUser);

// PUT /users/:id - Actualizar un usuario por ID (email o contraseña)
router.put('/:id', authMiddleware, adminAuth, userController.updateUser);

// DELETE /users/:id - Eliminar un usuario por ID
router.delete('/:id', authMiddleware, adminAuth, userController.deleteUser);

module.exports = router;