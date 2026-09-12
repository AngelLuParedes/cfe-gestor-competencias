import { Request, Response } from "express";
import pool from "../database.js";

class CursoController {
  
  public async lista(req: Request, res: Response) {
    const [datos] = await pool.query("SELECT * FROM cursos");
    res.json(datos);
  }

  public async crear(req: Request, res: Response) {
    await pool.query("INSERT INTO cursos SET ?", [req.body]);
    res.json({ message: "Curso guardado" });
  }

  public async actualiza(req: Request, res: Response) {
    const { id } = req.params;
    await pool.query("UPDATE cursos SET ? WHERE id_interno = ?", [req.body, id]);
    res.json({ message: "Curso actualizado" });
  }

  public async borrar(req: Request, res: Response) {
    const { id } = req.params;
    await pool.query("DELETE FROM cursos WHERE id_interno = ?", [id]);
    res.json({ message: "Se elimino el curso" });
  }

  public async buscar(req: Request, res: Response) {
    const { id } = req.params;
    const [curso]: any = await pool.query("SELECT * FROM cursos WHERE id_interno = ?", [id]);
    
    if (curso.length > 0) {
      return res.json(curso[0]);
    }
    res.status(404).json({ message: "No existe ese curso" });
  }

  public async obtenerTrabajadoresPorCurso(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const query = `
        SELECT 
            hc.id_registro,
            t.RPE, 
            t.NOMBRE_COMPLETO, 
            t.CURP,
            t.PUESTO,
            t.OCUPACION_ESPECIFICA,
            hc.fecha_inicio,
            hc.fecha_termino,
            hc.calificacion,
            hc.estado_cchl,
            hc.horas_acreditadas /* 🚀 NUEVO: Extraemos las horas individuales */
        FROM historial_capacitacion hc
        JOIN trabajadores t ON hc.rpe_trabajador = t.RPE
        JOIN cursos c ON hc.actividad_rel = c.ACTIVIDAD
        WHERE c.id_interno = ?
      `;
      const [trabajadores] = await pool.query(query, [id]);
      res.json(trabajadores);
    } catch (error) {
      console.error("Error al obtener trabajadores por curso:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }

  // 🚀 NUEVA FUNCIÓN: Para actualizar el historial (fechas, horas, calificación)
  public async actualizarHistorial(req: Request, res: Response) {
    const { id_registro } = req.params;
    const { fecha_inicio, fecha_termino, horas_acreditadas, calificacion } = req.body;

    try {
      await pool.query(
        "UPDATE historial_capacitacion SET fecha_inicio = ?, fecha_termino = ?, horas_acreditadas = ?, calificacion = ? WHERE id_registro = ?",
        [
          fecha_inicio || null, 
          fecha_termino || null, 
          horas_acreditadas || null, 
          calificacion || null, 
          id_registro
        ]
      );
      res.json({ message: "Registro actualizado exitosamente" });
    } catch (error) {
      console.error("Error actualizando historial:", error);
      res.status(500).json({ message: "Error interno del servidor al actualizar" });
    }
  }
}

const cursoController = new CursoController();
export default cursoController;