import { Request, Response } from "express";
import pool from "../database.js";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

class ExcelLlenadorController {
  
  public async llenarExcelConHistorial(req: Request, res: Response) {
    try {
      // Ahora acepta bateria_seleccionada por si el usuario quiere forzar una
      const { rpe_trabajador, bateria_seleccionada } = req.body;

      if (!rpe_trabajador) {
        res.status(400).json({ message: "RPE no proporcionado" });
        return;
      }

      // 1. DATOS DEL TRABAJADOR
      const [trabajadores]: any = await pool.query(
        "SELECT * FROM trabajadores WHERE RPE = ?",
        [rpe_trabajador]
      );

      if (trabajadores.length === 0) {
        res.status(404).json({ message: "Trabajador no encontrado" });
        return;
      }

      const trabajador = trabajadores[0];

      // 2. ¿QUÉ BATERÍA VAMOS A USAR? (La elegida o la de su puesto por defecto)
      const bateriaFiltro = bateria_seleccionada || trabajador.PUESTO;

      // 3. OBTENER LOS CURSOS DE ESA BATERÍA (El listado del lado izquierdo del Excel)
      const [cursosBateria]: any = await pool.query(
        `SELECT bc.clave_curso, c.NOMBRE_DEL_CURSO 
         FROM baterias_cursos bc
         LEFT JOIN cursos c ON bc.clave_curso = c.CLAVE_CURSO OR bc.clave_curso = c.ACTIVIDAD
         WHERE bc.nombre_puesto = ? OR bc.clave_bateria = ?
         GROUP BY bc.clave_curso`,
        [bateriaFiltro, bateriaFiltro]
      );

      if (cursosBateria.length === 0) {
        res.status(404).json({ message: `No se encontraron cursos de batería para el puesto: ${bateriaFiltro}` });
        return;
      }

      // 4. OBTENER EL HISTORIAL Y EL PUENTE DE TRADUCCIÓN (Para cruzar claves)
      const [historial]: any = await pool.query(
        "SELECT actividad_rel, fecha_termino, calificacion, estado_cchl FROM historial_capacitacion WHERE rpe_trabajador = ? AND fecha_termino IS NOT NULL",
        [rpe_trabajador]
      );

      const [puente]: any = await pool.query("SELECT ACTIVIDAD, CLAVE_CURSO FROM cursos");

      // Diccionario de traducción (F00009 -> DTC...)
      const mapaPuente = new Map();
      for (const p of puente) {
        if (p.ACTIVIDAD) {
          mapaPuente.set(String(p.ACTIVIDAD).trim().toUpperCase(), String(p.CLAVE_CURSO || '').trim().toUpperCase());
        }
      }

      // Diccionario de los cursos que el trabajador SÍ TOMÓ
      const mapaHistorial = new Map();
      for (const h of historial) {
        const actCorta = h.actividad_rel ? String(h.actividad_rel).trim().toUpperCase() : '';
        const claveDTC = mapaPuente.get(actCorta) || actCorta;
        
        mapaHistorial.set(claveDTC, {
          acreditado: h.estado_cchl === "APROBADO" ? "SÍ" : "NO",
          fecha: new Date(h.fecha_termino).toLocaleDateString("es-MX"),
          calificacion: h.calificacion || 100
        });
      }

      // 5. CARGAR TU PLANTILLA EXACTA (Busca dentro de la carpeta 'plantillas' de tu servidor)
      const rutaPlantilla = path.resolve("plantillas", "PCT ACE.xlsx");

      if (!fs.existsSync(rutaPlantilla)) {
        res.status(404).json({ message: `La plantilla no existe en la ruta: ${rutaPlantilla}` });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(rutaPlantilla);
      const ws = workbook.getWorksheet(1);

      if (!ws) {
        res.status(500).json({ message: "No se pudo leer la hoja del Excel" });
        return;
      }

      // 6. LLENAR DATOS DEL TRABAJADOR EN LA CABECERA
      ws.getCell("E8").value = trabajador.RPE;
      ws.getCell("C10").value = trabajador.PUESTO || "";

      // 7. INYECTAR LA BATERÍA Y REVISAR EL HISTORIAL
      let rowIndex = 17; // Fila donde empieza tu lista de cursos en el Excel
      let contador = 1;

      for (const curso of cursosBateria) {
        const claveDTC = curso.clave_curso ? String(curso.clave_curso).trim().toUpperCase() : '';
        const nombreCurso = curso.NOMBRE_DEL_CURSO || claveDTC;

        // Buscamos si la clave de la batería la tiene en su historial
        const registroTomado = mapaHistorial.get(claveDTC);

        const row = ws.getRow(rowIndex);
        
        row.getCell(1).value = contador;       // NO.
        row.getCell(2).value = claveDTC;       // CLAVE
        row.getCell(3).value = nombreCurso;    // DESCRIPCIÓN

        if (registroTomado) {
          // SÍ LO TIENE
          row.getCell(5).value = "SÍ";                          // ACREDITADO (Columna E)
          row.getCell(6).value = registroTomado.fecha;          // FECHA (Columna F)
          row.getCell(7).value = registroTomado.calificacion;   // CALIFICACIÓN (Columna G)
        } else {
          // NO LO TIENE
          row.getCell(5).value = "NO";
          row.getCell(6).value = "PENDIENTE";
          row.getCell(7).value = "";
        }

        rowIndex++;
        contador++;
      }

      // 8. ENVIAR ARCHIVO TERMINADO
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="PCT_ACE_${trabajador.RPE}.xlsx"`);
      res.send(buffer);

    } catch (error: any) {
      console.error("❌ Error al llenar Excel:", error);
      res.status(500).json({ message: "Error interno", error: error.message });
    }
  }

  // --- MANTUVE TU FUNCIÓN MÚLTIPLE AQUÍ ABAJO PARA QUE NO SE ROMPA NADA ---
  public async llenarExcelMultiple(req: Request, res: Response) {
      // ... Aquí va el resto del código que ya tenías para descarga múltiple ...
  }
}

const excelLlenadorController = new ExcelLlenadorController();
export default excelLlenadorController;