import jwt from "jsonwebtoken";
import pool from "../database.js";
const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_muy_segura_cambiar_en_produccion";
/**
 * Middleware para verificar la validez del JWT y la sesión en MariaDB
 */
export const verificarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Token no proporcionado" });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: "Formato de token inválido" });
        }
        // Casting a 'any' y luego a 'TokenPayload' para evitar conflictos de tipos
        const decoded = jwt.verify(token, JWT_SECRET);
        // Validación contra la tabla de sesiones en MariaDB
        const [sesiones] = await pool.query('SELECT activa FROM sesiones WHERE token = ? AND activa = TRUE', [token]);
        if (!sesiones || sesiones.length === 0) {
            return res.status(401).json({ message: "Sesión inválida o expirada" });
        }
        req.usuario = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: "Token inválido" });
        }
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "Token expirado" });
        }
        return res.status(500).json({ message: "Error al verificar token" });
    }
};
/**
 * Función genérica para verificar roles de usuario
 */
export const verificarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Verificamos si existe el usuario en la petición
        if (!req.usuario) {
            return res.status(401).json({ message: "No autorizado" });
        }
        // Validamos si el rol del usuario está en la lista de permitidos
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                message: "No tienes permisos para realizar esta acción"
            });
        }
        next();
    };
};
// Exportación de middlewares específicos para las rutas de CFE
export const esAdmin = verificarRol('admin');
export const esSupervisor = verificarRol('admin', 'supervisor');
//# sourceMappingURL=authMiddleware.js.map