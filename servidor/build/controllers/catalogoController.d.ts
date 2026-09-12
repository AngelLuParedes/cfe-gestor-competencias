import { Request, Response } from "express";
declare class CatalogosController {
    getOcupaciones(req: Request, res: Response): Promise<void>;
    getAreasTematicas(req: Request, res: Response): Promise<void>;
    getBaterias(req: Request, res: Response): Promise<void>;
    getCursosPorBateria(req: Request, res: Response): Promise<void>;
}
declare const catalogosController: CatalogosController;
export default catalogosController;
//# sourceMappingURL=catalogoController.d.ts.map