import { Request, Response } from "express";
import pool from "../database.js";

class TrabajadoresController {
  public async lista(req: Request, res: Response) {
    const [trabajadores] = await pool.query("SELECT * FROM trabajadores");
    res.json(trabajadores);
  }

  public async crear(req: Request, res: Response) {
    // ACTUALIZADO: Ahora extraemos también PUESTO y OCUPACION_ESPECIFICA
    const {
      RPE,
      NOMBRE_COMPLETO,
      CURP,
      PUESTO,
      OCUPACION_ESPECIFICA,
      actividad,
      fecha_inicio,
      fecha_termino,
      calificacion,
    } = req.body;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Insertamos al trabajador con los nuevos campos de CFE/STPS
      await connection.query("INSERT INTO trabajadores SET ?", {
        RPE,
        NOMBRE_COMPLETO,
        CURP,
        PUESTO,
        OCUPACION_ESPECIFICA,
      });

      // Registro en historial si el trabajador viene de la pantalla "Agregar a Curso"
      if (actividad) {
        const estado =
          parseFloat(calificacion) >= 80 ? "APROBADO" : "REPROBADO";

        await connection.query("INSERT INTO historial_capacitacion SET ?", {
          rpe_trabajador: RPE,
          actividad_rel: actividad,
          fecha_inicio,
          fecha_termino,
          calificacion: calificacion || 0,
          estado_cchl: estado,
        });
      }

      await connection.commit();
      res.json({ message: "Trabajador guardado exitosamente" });
    } catch (error: any) {
      await connection.rollback();
      console.error(error);
      if (error.errno === 1062) {
        res.status(400).json({ message: "El RPE o CURP ya existen." });
      } else {
        res.status(500).json({ message: "Error al guardar trabajador" });
      }
    } finally {
      connection.release();
    }
  }

  public async actualiza(req: Request, res: Response) {
    const { rpe } = req.params;
    // Gracias al uso de SET ?, si req.body trae PUESTO u OCUPACION_ESPECIFICA,
    // se actualizarán automáticamente sin cambiar esta línea.
    await pool.query("UPDATE trabajadores SET ? WHERE RPE = ?", [
      req.body,
      rpe,
    ]);
    res.json({ message: "Trabajador actualizado" });
  }

  public async borrar(req: Request, res: Response) {
    const { rpe } = req.params;
    try {
      await pool.query("DELETE FROM trabajadores WHERE RPE = ?", [rpe]);
      res.json({ message: "Trabajador eliminado" });
    } catch (error: any) {
      if (error.errno === 1451) {
        res
          .status(400)
          .json({
            message:
              "No se puede eliminar: El trabajador tiene historial de cursos.",
          });
      } else {
        res.status(500).json({ message: "Error al eliminar trabajador" });
      }
    }
  }

  public async buscar(req: Request, res: Response) {
    const { rpe } = req.params;
    const [trabajador]: any[] = await pool.query(
      "SELECT * FROM trabajadores WHERE RPE = ?",
      [rpe],
    );

    if (trabajador.length > 0) {
      return res.json(trabajador[0]);
    }
    res.status(404).json({ message: "No existe ese trabajador" });
  }

  public async obtenerCursos(req: Request, res: Response) {
    const { rpe } = req.params;
    try {
      // 🚀 CONSULTA CON DETECTOR DE BASURA:
      // Usamos LEFT JOIN para que los cursos "huérfanos" no se escondan.
      // Con COALESCE, si el nombre del curso está vacío (porque no existe en el catálogo),
      // le ponemos una advertencia visual para que el administrador sepa que debe borrarlo.
      const [cursos] = await pool.query(
        `
    SELECT 
        h.*, 
        c.NOMBRE_DEL_CURSO as nombre_curso,
        c.CLAVE_CURSO as clave_curso,
        c.DURACION_REAL_HRS as horas,
        c.clave_area_stps 
    FROM historial_capacitacion h
    INNER JOIN cursos c ON h.actividad_rel = c.ACTIVIDAD -- CAMBIO: Usar INNER en lugar de LEFT
    WHERE h.rpe_trabajador = ?
    ORDER BY h.fecha_termino DESC
`,
        [rpe],
      );
      res.json(cursos);
    } catch (error) {
      console.error("Error al obtener cursos del trabajador:", error);
      res
        .status(500)
        .json({ message: "Error al obtener historial de cursos." });
    }
  }
}

const trabajadoresController = new TrabajadoresController();
export default trabajadoresController;