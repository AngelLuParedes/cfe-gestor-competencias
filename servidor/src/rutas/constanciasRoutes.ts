import { Router } from "express";
import multer from "multer";
import constanciasController from "../controllers/constanciasController.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

class ConstanciasRoutes {
    public router: Router = Router();

    constructor() { this.config(); }

    config(): void {
        this.router.get('/', constanciasController.lista);
        this.router.post('/', constanciasController.crear);

        this.router.get('/historial/:rpe', constanciasController.historial);
        this.router.post('/generar', constanciasController.generarDocumento.bind(constanciasController));
        this.router.post('/generar-pdf', constanciasController.generarPdfIndividual);
        this.router.post('/generar-pdf-lote', constanciasController.generarPdfLote);
        this.router.post('/generar-pdf-manual', constanciasController.generarPdfManual);

        // ✅ NUEVO: fusiona varios PDFs en uno (recibe multipart/form-data, campo "pdfs")
        this.router.post('/merge-pdfs', upload.any(), constanciasController.mergePdfs);

        this.router.put('/resetear-estado/:id_registro', constanciasController.resetearEstado);
        this.router.delete('/:id', constanciasController.borrar);
    }
}

const constanciasRoutes = new ConstanciasRoutes();
export default constanciasRoutes.router;