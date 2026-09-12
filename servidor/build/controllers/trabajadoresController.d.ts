import { Request, Response } from "express";
declare class TrabajadoresController {
    lista(req: Request, res: Response): Promise<void>;
    crear(req: Request, res: Response): Promise<void>;
    actualiza(req: Request, res: Response): Promise<void>;
    borrar(req: Request, res: Response): Promise<void>;
    buscar(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    obtenerCursos(req: Request, res: Response): Promise<void>;
}
declare const trabajadoresController: TrabajadoresController;
export default trabajadoresController;
//# sourceMappingURL=trabajadoresController.d.ts.map