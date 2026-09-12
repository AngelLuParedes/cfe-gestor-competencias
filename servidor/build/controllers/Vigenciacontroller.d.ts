import { Request, Response } from "express";
declare class VigenciaController {
    obtenerVigenciaCompleta(req: Request, res: Response): Promise<void>;
    obtenerVigenciaPorMes(req: Request, res: Response): Promise<void>;
    obtenerAlertasVigencia(req: Request, res: Response): Promise<void>;
}
declare const vigenciaController: VigenciaController;
export default vigenciaController;
//# sourceMappingURL=Vigenciacontroller.d.ts.map