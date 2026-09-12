import { Request, Response } from "express";
declare class CursoController {
    lista(req: Request, res: Response): Promise<void>;
    crear(req: Request, res: Response): Promise<void>;
    actualiza(req: Request, res: Response): Promise<void>;
    borrar(req: Request, res: Response): Promise<void>;
    buscar(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    obtenerTrabajadoresPorCurso(req: Request, res: Response): Promise<void>;
    actualizarHistorial(req: Request, res: Response): Promise<void>;
}
declare const cursoController: CursoController;
export default cursoController;
//# sourceMappingURL=cursoController.d.ts.map