import { Router } from "express";
import cursoController from "../controllers/cursoController.js";
class DatosRoutes {
    router = Router();
    constructor() {
        this.config();
    }
    config() {
        this.router.get('/', cursoController.lista);
        this.router.post('/', cursoController.crear);
        this.router.put('/:id', cursoController.actualiza);
        this.router.delete('/:id', cursoController.borrar);
        this.router.get('/:id', cursoController.buscar);
        this.router.get('/trabajadores/:id', cursoController.obtenerTrabajadoresPorCurso);
        // 🚀 NUEVA RUTA: Recibe los datos editados del historial y los guarda en la base de datos
        this.router.put('/historial/:id_registro', cursoController.actualizarHistorial);
    }
}
const datosRoutes = new DatosRoutes();
export default datosRoutes.router;
//# sourceMappingURL=cursoRoutes.js.map