import { Request, Response } from "express";
declare class ConstanciasController {
    private separarCaracteres;
    private desglosarNombre;
    private desglosarFecha;
    private escribirEnCasillas;
    private cargarPlantillaLimpia;
    private inyectarDatosEnPDF;
    lista: (req: Request, res: Response) => Promise<void>;
    crear: (req: Request, res: Response) => Promise<void>;
    borrar: (req: Request, res: Response) => Promise<void>;
    historial: (req: Request, res: Response) => Promise<void>;
    resetearEstado: (req: Request, res: Response) => Promise<void>;
    generarPdfIndividual: (req: Request, res: Response) => Promise<void>;
    generarPdfLote: (req: Request, res: Response) => Promise<void>;
    generarDocumento: (req: Request, res: Response) => Promise<void>;
    generarPdfManual: (req: Request, res: Response) => Promise<void>;
    mergePdfs: (req: Request, res: Response) => Promise<void>;
}
declare const constanciasController: ConstanciasController;
export default constanciasController;
//# sourceMappingURL=constanciasController.d.ts.map