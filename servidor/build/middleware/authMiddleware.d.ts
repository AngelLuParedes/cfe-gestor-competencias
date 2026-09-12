import { Request, Response, NextFunction } from "express";
interface TokenPayload {
    id_usuario: number;
    email: string;
    rol: string;
}
declare global {
    namespace Express {
        interface Request {
            usuario?: TokenPayload;
        }
    }
}
/**
 * Middleware para verificar la validez del JWT y la sesión en MariaDB
 */
export declare const verificarToken: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Función genérica para verificar roles de usuario
 */
export declare const verificarRol: (...rolesPermitidos: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const esAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const esSupervisor: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export {};
//# sourceMappingURL=authMiddleware.d.ts.map