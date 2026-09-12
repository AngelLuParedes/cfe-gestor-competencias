import { Request, Response } from 'express';
import type { Pool } from 'mysql2/promise';
export declare const setPool: (p: Pool) => void;
export declare const diagnostico: (_req: Request, res: Response) => Promise<void>;
export declare const cargarCompleto: (req: Request, res: Response) => Promise<void>;
export declare const cargarCursos: (req: Request, res: Response) => Promise<void>;
export declare const cargarTrabajadores: (req: Request, res: Response) => Promise<void>;
export declare const cargarHistorial: (req: Request, res: Response) => Promise<void>;
export declare const cargarKardex: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=cargaExcelController.d.ts.map