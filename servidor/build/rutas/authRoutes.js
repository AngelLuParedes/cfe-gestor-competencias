import { Router } from "express";
import authController from "../controllers/authController.js";
const router = Router();
// Rutas públicas (no requieren autenticación)
router.post('/register', authController.register);
router.post('/login', authController.login);
// Rutas protegidas (requieren token)
router.post('/logout', authController.logout);
router.get('/verificar', authController.verificarToken);
router.post('/cambiar-password', authController.cambiarPassword);
router.put('/perfil', authController.actualizarPerfil);
// Solo administradores
router.get('/usuarios', authController.listarUsuarios);
export default router;
//# sourceMappingURL=authRoutes.js.map