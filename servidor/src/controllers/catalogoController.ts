import { Request, Response } from "express";
import pool from '../database.js';

class CatalogosController {
    public async getOcupaciones(req: Request, res: Response) {
        const [datos] = await pool.query('SELECT * FROM ocupaciones');
        res.json(datos);
    }

    public async getAreasTematicas(req: Request, res: Response) {
        const [datos] = await pool.query('SELECT * FROM areas_tematicas');
        res.json(datos);
    }

    // 🚀 Lista de baterías únicas (clave + nombre_puesto) para llenar el <select>
    public async getBaterias(req: Request, res: Response) {
        try {
            const [datos] = await pool.query(
                `SELECT
                    clave_bateria,
                    nombre_puesto,
                    MIN(tipo_bateria)  AS tipo_bateria,
                    MIN(tipo_contrato) AS tipo_contrato
                 FROM baterias
                 GROUP BY clave_bateria, nombre_puesto
                 ORDER BY nombre_puesto, clave_bateria`
            );
            res.json(datos);
        } catch (error) {
            console.error("Error al obtener baterías:", error);
            res.status(500).json({ message: "Error al obtener el catálogo de baterías" });
        }
    }

    // 🚀 CORREGIDO: Filtra por nombre_puesto y/o clave_bateria para evitar 
    // mezclar cursos cuando la misma clave pertenece a puestos distintos.
    public async getCursosPorBateria(req: Request, res: Response) {
        try {
            const { clave } = req.params;
            const { puesto, nombre } = req.query; 

            // Capturamos el puesto enviado desde req.query (?puesto=... o ?nombre=...)
            const nombrePuesto = (puesto || nombre) as string | undefined;

            if (!clave && !nombrePuesto) {
                res.status(400).json({ message: "Se requiere la clave o el nombre del puesto" });
                return;
            }

            let query = `
                SELECT
                    MIN(bc.clave_bateria)  AS clave_bateria,
                    MIN(bc.nombre_puesto)  AS nombre_puesto,
                    cb.clave_curso,
                    MIN(cb.nombre_curso)   AS nombre_curso,
                    MIN(cb.modalidad)      AS modalidad,
                    MIN(cb.horas_teoria)   AS horas_teoria,
                    MIN(cb.horas_practica) AS horas_practica,
                    MAX(bc.vigencia_anios) AS vigencia_anios
                 FROM baterias_cursos bc
                 INNER JOIN cursos_baterias cb
                    ON bc.clave_curso = cb.clave_curso
            `;

            const queryParams: any[] = [];

            // 1. Si vienen AMBOS (Clave y Nombre del puesto), hacemos la búsqueda exacta doble
            if (clave && nombrePuesto) {
                query += ` WHERE bc.clave_bateria = ? AND bc.nombre_puesto = ?`;
                queryParams.push(String(clave), String(nombrePuesto));
            } 
            // 2. Si solo viene el nombre del puesto
            else if (nombrePuesto) {
                query += ` WHERE bc.nombre_puesto = ?`;
                queryParams.push(String(nombrePuesto));
            } 
            // 3. Fallback: Si solo viene la clave por la ruta
            else {
                query += ` WHERE bc.clave_bateria = ?`;
                queryParams.push(String(clave));
            }

            query += ` GROUP BY cb.clave_curso ORDER BY nombre_curso`;

            const [datos] = await pool.query(query, queryParams);
            res.json(datos);

        } catch (error) {
            console.error("Error al obtener cursos de la batería:", error);
            res.status(500).json({ message: "Error al obtener cursos de la batería" });
        }
    }
}

const catalogosController = new CatalogosController();
export default catalogosController;