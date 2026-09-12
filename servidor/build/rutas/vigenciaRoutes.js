import { Router } from 'express';
// Ojo: Respetamos la "V" mayúscula de tu archivo Vigenciacontroller.ts
import vigenciaController from '../controllers/Vigenciacontroller.js';
class VigenciaRoutes {
    router = Router();
    constructor() {
        this.config();
    }
    config() {
        this.router.get('/', vigenciaController.obtenerVigenciaCompleta);
        this.router.get('/mes/:mes', vigenciaController.obtenerVigenciaPorMes);
        this.router.get('/alertas', vigenciaController.obtenerAlertasVigencia);
    }
}
const vigenciaRoutes = new VigenciaRoutes();
export default vigenciaRoutes.router;
//# sourceMappingURL=vigenciaRoutes.js.map