const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // 1. Obtener el token del header
    // El formato esperado es: Authorization: Bearer <TOKEN>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token o el formato es incorrecto.' });
    }

    // Extraer el token (eliminar 'Bearer ')
    const token = authHeader.split(' ')[1];

    try {
        // 2. Verificar el token usando la clave secreta
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Adjuntar la información decodificada del usuario a la solicitud
        // Esto permite acceder al ID del usuario en las rutas protegidas.
        req.user = decoded; 
        
        // 4. Continuar con la ejecución de la ruta
        next();
    } catch (error) {
        // Token inválido (expirado, alterado, etc.)
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};



module.exports = authMiddleware;