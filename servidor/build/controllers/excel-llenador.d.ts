import { Request, Response } from "express";
declare class ExcelLlenadorController {
    llenarExcelConHistorial(req: Request, res: Response): Promise<void>;
    llenarExcelMultiple(req: Request, res: Response): Promise<void>;
}
declare const excelLlenadorController: ExcelLlenadorController;
export default excelLlenadorController;
//# sourceMappingURL=excel-llenador.d.ts.map