import { Router } from "express";
import trabajadoresController from "../controllers/trabajadoresController.js";
import kardexController from "../controllers/kardexController.js";
class TrabajadoresRoutes {
    router = Router();
    constructor() {
        this.config();
    }
    config() {
        this.router.get('/', trabajadoresController.lista);
        this.router.post('/', trabajadoresController.crear);
        this.router.get('/:rpe', trabajadoresController.buscar);
        this.router.put('/:rpe', trabajadoresController.actualiza);
        this.router.delete('/:rpe', trabajadoresController.borrar);
        this.router.get('/:rpe/cursos', trabajadoresController.obtenerCursos);
        this.router.post('/kardex/generar', kardexController.generarKardex);
        this.router.post('/kardex/generar-lote', kardexController.generarKardexLote);
    }
}
const trabajadoresRoutes = new TrabajadoresRoutes();
export default trabajadoresRoutes.router;
//# sourceMappingURL=trabajadoresRoutes.js.map