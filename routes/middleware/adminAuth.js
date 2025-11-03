// middleware/adminAuth.js

/**
 * Middleware para restringir el acceso solo al usuario administrador 'bob'.
 * Asume que el middleware 'auth.js' ya ha adjuntado la información del usuario (req.user)
 * incluyendo el campo 'username' que viene en el token (asegúrate de incluir 'username' en tu payload JWT).
 */
const adminAuth = (req, res, next) => {
    // Verificar si la información del usuario está disponible
    if (!req.user || !req.user.username) {
        return res.status(401).json({ message: 'Token de autenticación incompleto o usuario no identificado.' });
    }
    
    // Comprobar si el usuario es 'bob'
    if (req.user.username === 'bob') {
        next(); // Es bob, permitir acceso a la ruta.
    } else {
        return res.status(403).json({ message: 'Acceso denegado: Se requiere privilegios de administrador (usuario bob).' });
    }
};

module.exports = adminAuth;