import { Router } from "express";
import { indexController } from "../controllers/indexController.js";
class IndexRoutes {
    router = Router();
    constructor() {
        this.config();
    }
    config() {
        this.router.get('/', indexController.index); //ruta inicial del indexController
    }
}
const indexRoutes = new IndexRoutes();
export default indexRoutes.router;
//# sourceMappingURL=indexRoutes.js.map