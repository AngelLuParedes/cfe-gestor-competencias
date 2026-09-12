import { Router } from 'express';
import multer from 'multer';
import { cargarCursos, cargarTrabajadores, cargarHistorial, cargarCompleto, diagnostico, cargarKardex // <-- 1. AQUÍ AGREGAMOS LA NUEVA FUNCIÓN
 } from '../controllers/cargaExcelController.js';
const router = Router();
const TIPOS_PERMITIDOS = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
];
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        TIPOS_PERMITIDOS.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error('Solo se permiten archivos .xlsx, .xls o .csv'));
    }
});
function multerErrorHandler(err, _req, res, next) {
    if (err instanceof multer.MulterError) {
        res.status(400).json({
            mensaje: err.code === 'LIMIT_FILE_SIZE'
                ? 'El archivo supera el límite de 10 MB.'
                : `Error de carga: ${err.message}`
        });
        return;
    }
    if (err instanceof Error) {
        res.status(400).json({ mensaje: err.message });
        return;
    }
    next(err);
}
// GET http://localhost:3000/api/carga-excel/diagnostico
// Abre en el navegador para verificar pool, tablas y permisos de escritura.
router.get('/diagnostico', diagnostico);
router.post('/completo', upload.single('archivo'), cargarCompleto, multerErrorHandler);
router.post('/cursos', upload.single('archivo'), cargarCursos, multerErrorHandler);
router.post('/trabajadores', upload.single('archivo'), cargarTrabajadores, multerErrorHandler);
router.post('/historial', upload.single('archivo'), cargarHistorial, multerErrorHandler);
// <-- 2. AQUÍ AGREGAMOS LA NUEVA RUTA DEL KARDEX (Protegida por tu error handler) -->
router.post('/kardex', upload.single('archivo'), cargarKardex, multerErrorHandler);
export default router;
//# sourceMappingURL=cargaExcelRoutes.js.map