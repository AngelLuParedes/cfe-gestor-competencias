import { Request, Response } from "express";
declare class AuthController {
    register(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    login(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    logout(req: Request, res: Response): Promise<void>;
    verificarToken(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    cambiarPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Recuperación de contraseña vía email o clave de 5 caracteres.
     * Genera una contraseña temporal, la hashea con bcrypt y la guarda.
     * Responde de forma genérica siempre (exista o no el usuario) para
     * evitar enumeración de cuentas.
     */
    forgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    actualizarPerfil(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    listarUsuarios(req: Request, res: Response): Promise<void>;
}
declare const authController: AuthController;
export default authController;
//# sourceMappingURL=authController.d.ts.map