import { Router } from "express";

import { indexController } from "../controllers/indexController.js";

class IndexRoutes {
    public router: Router = Router();

    constructor(){
        this.config();
    }

    config(): void{
        this.router.get('/', indexController.index); //ruta inicial del indexController
    }
}

const indexRoutes = new IndexRoutes();
export default indexRoutes.router;