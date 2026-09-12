import { Router } from "express";
import catalogosController from "../controllers/catalogoController.js";
class CatalogosRoutes {
    router = Router();
    constructor() {
        this.config();
    }
    config() {
        // Rutas para obtener los catálogos de la STPS
        this.router.get('/ocupaciones', catalogosController.getOcupaciones);
        this.router.get('/areas', catalogosController.getAreasTematicas);
        // Rutas para baterías y cursos
        this.router.get('/baterias', catalogosController.getBaterias);
        this.router.get('/baterias/:clave/cursos', catalogosController.getCursosPorBateria);
    }
}
const catalogosRoutes = new CatalogosRoutes();
export default catalogosRoutes.router;
//# sourceMappingURL=catalogosRoutes.js.map