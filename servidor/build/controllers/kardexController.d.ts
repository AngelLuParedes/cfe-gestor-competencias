import { Request, Response } from "express";
declare class KardexController {
    /**
     * Genera un kardex en PDF con datos del trabajador y sus cursos
     * Recibe en el body:
     * - rpe_trabajador
     * - nombre_trabajador
     * - curp
     * - puesto
     * - ocupacion
     * - cursos (array con nombre_curso, fecha_inicio, fecha_termino, calificacion, horas, estado, acreditado)
     */
    generarKardex: (req: Request, res: Response) => Promise<void>;
    /**
     * Genera kardex para múltiples trabajadores
     */
    generarKardexLote: (req: Request, res: Response) => Promise<void>;
}
declare const kardexController: KardexController;
export default kardexController;
//# sourceMappingURL=kardexController.d.ts.map