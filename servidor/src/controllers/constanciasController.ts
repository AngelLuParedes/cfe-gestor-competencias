import { Request, Response } from "express";
import pool from "../database.js";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta de tu plantilla PDF
const RUTA_PLANTILLA_PDF = path.join(
  "C:/Users/pcAng/Downloads/cfe proyecto - copia/servidor/plantillas/DC3 MACHOTE Editableprueba.pdf",
);

class ConstanciasController {
  // ====================================================================
  // HELPERS (COMPARTIDOS Y DE WORD)
  // ====================================================================
  private separarCaracteres(texto: string, prefijo: string): any {
    const resultado: any = {};
    const textoLimpio = (texto || "").toString().toUpperCase().trim();
    for (let i = 0; i < textoLimpio.length; i++) {
      resultado[`${prefijo}${i}`] = textoLimpio[i];
    }
    return resultado;
  }

  private desglosarNombre(nombreCompleto: string) {
    if (!nombreCompleto) return { nombres: "", ap_paterno: "", ap_materno: "" };
    const partes = nombreCompleto.trim().split(" ");
    if (partes.length < 3)
      return {
        nombres: partes[0],
        ap_paterno: partes[1] || "",
        ap_materno: "",
      };
    const ap_materno = partes.pop();
    const ap_paterno = partes.pop();
    const nombres = partes.join(" ");
    return { nombres, ap_paterno, ap_materno };
  }

  private desglosarFecha(fecha: any, prefijo: string) {
    if (!fecha) return {};
    const dateObj = new Date(fecha);
    if (isNaN(dateObj.getTime())) return {};
    const anio = dateObj.getFullYear().toString();
    const mes = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const dia = dateObj.getDate().toString().padStart(2, "0");
    return {
      [`${prefijo}y0`]: anio[0],
      [`${prefijo}y1`]: anio[1],
      [`${prefijo}y2`]: anio[2],
      [`${prefijo}y3`]: anio[3],
      [`${prefijo}m0`]: mes[0],
      [`${prefijo}m1`]: mes[1],
      [`${prefijo}d0`]: dia[0],
      [`${prefijo}d1`]: dia[1],
    };
  }

  // ====================================================================
  // HELPERS EXCLUSIVOS PARA PDF
  // ====================================================================
  private escribirEnCasillas = (
    pagina: any,
    texto: string,
    xInicial: number,
    y: number,
    espaciado: number,
    fuente: any,
    size: number,
  ) => {
    const textoLimpio = String(texto || "")
      .toUpperCase()
      .trim();
    for (let i = 0; i < textoLimpio.length; i++) {
      pagina.drawText(textoLimpio[i], {
        x: xInicial + i * espaciado,
        y,
        size,
        font: fuente,
        color: rgb(0, 0, 0),
      });
    }
  };

  private cargarPlantillaLimpia = async (): Promise<PDFDocument> => {
    if (!fs.existsSync(RUTA_PLANTILLA_PDF)) {
      throw new Error("Plantilla PDF no encontrada en: " + RUTA_PLANTILLA_PDF);
    }
    const plantillaBytes = fs.readFileSync(RUTA_PLANTILLA_PDF);
    const pdfDoc = await PDFDocument.load(plantillaBytes, {
      ignoreEncryption: true,
    });
    try {
      pdfDoc.getForm().flatten();
    } catch (_) {}
    return pdfDoc;
  };

  // INYECTOR MAESTRO DE DATOS PDF (CON COORDENADAS, FUENTES Y ESTILOS)
  private inyectarDatosEnPDF = async (
    pagina: any,
    fuenteNormal: any, 
    fuenteNegrita: any, 
    trabajador: any,
    firmas: { instructor: string; patron: string; representante: string },
  ) => {
    const { height } = pagina.getSize();

    // Definimos los estilos para reutilizarlos
    const cNormal = { font: fuenteNormal, color: rgb(0, 0, 0) };
    const cBold = { font: fuenteNegrita, color: rgb(0, 0, 0) };

    // --- Búsqueda de textos auxiliares ---
    let textoOcupacion = trabajador.OCUPACION_ESPECIFICA || "";
    if (trabajador.clave_ocupacion) {
      const [rows]: any = await pool.query(
        "SELECT ocupacion_especifica FROM ocupaciones WHERE clave = ?",
        [trabajador.clave_ocupacion],
      );
      if (rows.length > 0) textoOcupacion = rows[0].ocupacion_especifica;
    }

    let textoArea = trabajador.AREA_TEMATICA || trabajador.clave_area_stps || "";
    if (trabajador.clave_area_stps && /^\d+$/.test(String(trabajador.clave_area_stps).trim())) {
      const [rows]: any = await pool.query(
        "SELECT nombre_area FROM areas_tematicas WHERE clave = ?",
        [trabajador.clave_area_stps],
      );
      if (rows.length > 0)
        textoArea = `${trabajador.clave_area_stps} - ${rows[0].nombre_area}`;
    }

    // ==================================================================
    // 1. DATOS TRABAJADOR
    // ==================================================================
    const nombreBase = String(trabajador.NOMBRE_COMPLETO || "").toUpperCase();
    const nombreConSeparacion = nombreBase
      .split(" ")
      .map((palabra) => palabra.split("").join(" "))
      .join("     ");

    // Nombre en NEGRITA (Bold) y tamaño 10
    pagina.drawText(nombreConSeparacion, {
      x: 30,
      y: height - 137,
      size: 10,
      ...cBold,
    });

    // CURP en NEGRITA (Bold) y tamaño 10
    this.escribirEnCasillas(
      pagina,
      trabajador.CURP || "",
      32,
      height - 175,
      17.5,
      fuenteNegrita,
      10,
    );

    // =========================================================
      // 1. DIBUJAR OCUPACIÓN (Con salto de línea automático)
      // =========================================================
      const textoOcu = String(textoOcupacion).toUpperCase();

      pagina.drawText(textoOcu, {
        x: 348,
        y: height - 168, // 🚀 Subimos un poco la Y para que quepan 2 renglones
        size: 9,         // Letra a 9 para que se vea limpio
        maxWidth: 240,   // 🚀 EL SECRETO: Ancho máximo antes de saltar abajo
        lineHeight: 11,  // 🚀 Espacio de separación entre los renglones
        ...cBold, 
      });

      // =========================================================
      // 2. DIBUJAR PUESTO (Con salto de línea automático)
      // =========================================================
      const textoPuesto = String(trabajador.puesto_en_constancia || trabajador.PUESTO || "").toUpperCase();

      pagina.drawText(textoPuesto, {
        x: 30, 
        y: height - 201, // 🚀 Subimos un poco la Y
        size: 9, 
        maxWidth: 530,   // 🚀 Ancho máximo de la caja completa
        lineHeight: 11,  // 🚀 Espacio entre los renglones
        ...cBold, 
      });

    // ==================================================================
    // 2. DATOS PROGRAMA
    // ==================================================================
    // Nombre del curso en NEGRITA
    pagina.drawText(String(trabajador.NOMBRE_DEL_CURSO || "").toUpperCase(), {
      x: 32,
      y: height - 372, // Lo subí un poquito (de 370 a 365) para que no choque si se hacen 2 líneas
      size: 9,
      maxWidth: 545,   // ✅ LA SOLUCIÓN: Limita el ancho y obliga al texto a bajar de renglón
      lineHeight: 10,  // ✅ Espacio entre las líneas si llega a brincar
      ...cBold,
    });

    // Duración en NORMAL
    const horasImprimir = trabajador.horas_acreditadas || trabajador.DURACION_REAL_HRS || "0";
    
    pagina.drawText(String(horasImprimir), {
      x: 68,
      y: height - 425,
      size: 10,
      ...cNormal,
    });

    if (trabajador.fecha_inicio) {
      const d = new Date(trabajador.fecha_inicio);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      // Fechas en NORMAL
      this.escribirEnCasillas(pagina, String(d.getFullYear()), 213, height - 425, 21, fuenteNormal, 10);
      this.escribirEnCasillas(pagina, String(d.getMonth() + 1).padStart(2, "0"), 297, height - 425, 22, fuenteNormal, 10);
      this.escribirEnCasillas(pagina, String(d.getDate()).padStart(2, "0"), 340, height - 425, 21, fuenteNormal, 10);
    }

    if (trabajador.fecha_termino) {
      const d = new Date(trabajador.fecha_termino);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      this.escribirEnCasillas(pagina, String(d.getFullYear()), 415, height - 425, 21, fuenteNormal, 10);
      this.escribirEnCasillas(pagina, String(d.getMonth() + 1).padStart(2, "0"), 500, height - 425, 22, fuenteNormal, 10);
      this.escribirEnCasillas(pagina, String(d.getDate()).padStart(2, "0"), 544, height - 425, 21, fuenteNormal, 10);
    }

    // Área Temática (Normal)
    pagina.drawText(String(textoArea).toUpperCase(), {
      x: 32,
      y: height - 455,
      size: 8,
      ...cBold,
    });

    // ==================================================================
    // 3. FIRMAS (DISEÑO PROFESIONAL CENTRADO)
    // ==================================================================
    const Y_FIRMAS = height - 616; // Subimos un par de píxeles para que quede justo sobre tu línea

    // Función inteligente para centrar nombres
    const dibujarFirma = (texto: string, centroX: number) => {
      if (!texto) return;
      
      const textoMayus = texto.toUpperCase();
      const fontSize = 7;
      const textWidth = fuenteNegrita.widthOfTextAtSize(textoMayus, fontSize);
      
      // 1. Dibujamos ÚNICAMENTE el nombre (Centrado). 
      // Ya NO dibujamos la línea porque el PDF ya la trae integrada.
      pagina.drawText(textoMayus, {
        x: centroX - (textWidth / 2),
        y: Y_FIRMAS,
        size: fontSize,
        ...cNormal,
      });
    };

    // Aplicamos la función usando el centro estimado de cada columna
    dibujarFirma(firmas.instructor, 130);       // Columna 1 (Izquierda)
    dibujarFirma(firmas.patron, 310);           // Columna 2 (Centro)
    dibujarFirma(firmas.representante, 495);    // Columna 3 (Derecha)
  };

  // ====================================================================
  // CRUD BÁSICO
  // ====================================================================
  public lista = async (req: Request, res: Response) => {
    const query = `
      SELECT cg.*, t.NOMBRE_COMPLETO, c.NOMBRE_DEL_CURSO 
      FROM constancias_generadas cg
      JOIN trabajadores t ON cg.rpe_trabajador = t.RPE
      JOIN cursos c ON cg.clave_curso = c.CLAVE_CURSO
    `;
    const [datos] = await pool.query(query);
    res.json(datos);
  };

  public crear = async (req: Request, res: Response) => {
    const {
      rpe_trabajador,
      clave_curso,
      puesto_en_constancia,
      clave_ocupacion,
      clave_area_stps,
    } = req.body;
    const datosRegistro = {
      rpe_trabajador,
      clave_curso,
      puesto_en_constancia,
      clave_ocupacion,
      clave_area_stps,
    };
    try {
      const [existe]: any = await pool.query(
        "SELECT id_constancia FROM constancias_generadas WHERE rpe_trabajador = ? AND clave_curso = ?",
        [rpe_trabajador, clave_curso],
      );
      if (existe.length > 0) {
        await pool.query(
          "UPDATE constancias_generadas SET ? WHERE id_constancia = ?",
          [datosRegistro, existe[0].id_constancia],
        );
        res.json({ message: "Constancia actualizada" });
      } else {
        await pool.query("INSERT INTO constancias_generadas SET ?", [
          datosRegistro,
        ]);
        res.json({ message: "Constancia creada" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error BD" });
    }
  };

  public borrar = async (req: Request, res: Response) => {
    const { id } = req.params;
    await pool.query(
      "DELETE FROM constancias_generadas WHERE id_constancia = ?",
      [id],
    );
    res.json({ message: "Estatus reseteado" });
  };

  public historial = async (req: Request, res: Response) => {
    const { rpe } = req.params;
    try {
      const query = `
        SELECT hc.id_registro, hc.clave_curso_rel, c.NOMBRE_DEL_CURSO, c.ACTIVIDAD,
               c.DURACION_REAL_HRS,   /* 🚀 Dato base */
               hc.horas_acreditadas,  /* 🚀 NUEVO: Dato específico del trabajador */
               hc.fecha_inicio, hc.fecha_termino, hc.calificacion, hc.estado_cchl,
               cg.id_constancia, 
               CASE WHEN cg.id_constancia IS NOT NULL THEN 1 ELSE 0 END as ya_generado
        FROM historial_capacitacion hc
        JOIN cursos c ON hc.clave_curso_rel = c.CLAVE_CURSO
        LEFT JOIN constancias_generadas cg 
          ON hc.rpe_trabajador = cg.rpe_trabajador AND hc.clave_curso_rel = cg.clave_curso
        WHERE hc.rpe_trabajador = ? ORDER BY hc.fecha_termino DESC
      `;
      const [historial] = await pool.query(query, [rpe]);
      res.json(historial);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error SQL" });
    }
  };

  public resetearEstado = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { id_registro } = req.params;
    try {
      // 1. Buscamos el registro usando "actividad_rel"
      const [hc]: any = await pool.query(
        "SELECT rpe_trabajador, actividad_rel FROM historial_capacitacion WHERE id_registro = ?",
        [id_registro],
      );

      if (!hc.length) {
        res.status(404).json({ message: "Registro no encontrado" });
        return;
      }

      // 2. Borramos la constancia usando "actividad_rel"
      await pool.query(
        "DELETE FROM constancias_generadas WHERE rpe_trabajador = ? AND actividad_rel = ?",
        [hc[0].rpe_trabajador, hc[0].actividad_rel],
      );

      // 3. Reseteamos el estado a "NO GENERADA"
      await pool.query(
        "UPDATE historial_capacitacion SET estado_cchl = 'NO GENERADA' WHERE id_registro = ?",
        [id_registro],
      );

      res.json({ message: "Estado reseteado" });
    } catch (error: any) {
      console.error("❌ resetearEstado:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // ====================================================================
  // NUEVOS MÉTODOS PDF (CONECTADOS Y FUNCIONALES)
  // ====================================================================
  public generarPdfIndividual = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        rpe_trabajador,
        actividad_rel,
        fecha_inicio,
        id_registro,
        firmas = { instructor: "", patron: "", representante: "" },
      } = req.body;

      if (!rpe_trabajador || !actividad_rel) {
        res.status(400).json({ message: "Faltan datos." });
        return;
      }

      let query: string;
      let params: any[];

      if (id_registro) {
        query = `
          SELECT t.NOMBRE_COMPLETO, t.CURP, t.RPE,
                 t.PUESTO, t.OCUPACION_ESPECIFICA,
                 c.NOMBRE_DEL_CURSO, c.DURACION_REAL_HRS,
                 hc.fecha_inicio, hc.fecha_termino, 
                 hc.horas_acreditadas, /* 🚀 AÑADIMOS ESTO */
                 cg.puesto_en_constancia, cg.clave_ocupacion,
                 COALESCE(cg.clave_area_stps, c.clave_area_stps) AS clave_area_stps
          FROM trabajadores t
          JOIN historial_capacitacion hc ON hc.rpe_trabajador = t.RPE
          JOIN cursos c ON hc.actividad_rel = c.ACTIVIDAD
          LEFT JOIN constancias_generadas cg 
            ON cg.rpe_trabajador = t.RPE AND cg.actividad_rel = c.ACTIVIDAD
          WHERE hc.id_registro = ? AND t.RPE = ? AND c.ACTIVIDAD = ? LIMIT 1`;
        params = [id_registro, rpe_trabajador, actividad_rel];
      } else {
        query = `
          SELECT t.NOMBRE_COMPLETO, t.CURP, t.RPE,
                 t.PUESTO, t.OCUPACION_ESPECIFICA,
                 c.NOMBRE_DEL_CURSO, c.DURACION_REAL_HRS,
                 hc.fecha_inicio, hc.fecha_termino, 
                 hc.horas_acreditadas, /* 🚀 AÑADIMOS ESTO */
                 cg.puesto_en_constancia, cg.clave_ocupacion, 
                 COALESCE(cg.clave_area_stps, c.clave_area_stps) AS clave_area_stps
          FROM trabajadores t
          JOIN historial_capacitacion hc ON hc.rpe_trabajador = t.RPE
          JOIN cursos c ON hc.actividad_rel = c.ACTIVIDAD
          LEFT JOIN constancias_generadas cg 
            ON cg.rpe_trabajador = t.RPE AND cg.actividad_rel = c.ACTIVIDAD
          WHERE t.RPE = ? AND c.ACTIVIDAD = ? ORDER BY hc.fecha_inicio DESC LIMIT 1`;
        params = [rpe_trabajador, actividad_rel];
      }

      const [datos]: any = await pool.query(query, params);

      if (!datos.length) {
        res.status(404).json({ message: "No se encontraron datos." });
        return;
      }

      const pdfDoc = await this.cargarPlantillaLimpia();

      // Cargamos Helvetica (Sans-serif) en sus dos versiones
      const fuenteNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fuenteNegrita = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pagina = pdfDoc.getPages()[0];

      // Ahora pasamos las dos fuentes a la función
      await this.inyectarDatosEnPDF(
        pagina,
        fuenteNormal,
        fuenteNegrita,
        datos[0],
        firmas,
      );

      const pdfBytes = await pdfDoc.save();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="DC3_${rpe_trabajador}.pdf"`,
      );
      res.send(Buffer.from(pdfBytes));
    } catch (error: any) {
      console.error("❌ Error PDF:", error);
      res.status(500).json({ message: "Error interno" });
    }
  };

  public generarPdfLote = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        rpes_trabajadores,
        actividad_rel,
        firmas = { instructor: "", patron: "", representante: "" },
      } = req.body;

      if (!rpes_trabajadores?.length) {
        res.status(400).json({ message: "No hay RPEs." });
        return;
      }

      const query = `
        SELECT t.NOMBRE_COMPLETO, t.CURP, t.RPE,
               t.PUESTO, t.OCUPACION_ESPECIFICA,
               c.NOMBRE_DEL_CURSO, c.DURACION_REAL_HRS,
               hc.fecha_inicio, hc.fecha_termino,
               hc.horas_acreditadas, /* 🚀 AÑADIMOS ESTO */
               cg.puesto_en_constancia, cg.clave_ocupacion, 
               COALESCE(cg.clave_area_stps, c.clave_area_stps) AS clave_area_stps
        FROM trabajadores t
        JOIN historial_capacitacion hc ON hc.rpe_trabajador = t.RPE
        JOIN cursos c ON hc.actividad_rel = c.ACTIVIDAD
        LEFT JOIN constancias_generadas cg 
          ON cg.rpe_trabajador = t.RPE AND cg.actividad_rel = c.ACTIVIDAD
        WHERE t.RPE IN (?) AND c.ACTIVIDAD = ?
        GROUP BY t.RPE, t.PUESTO, t.OCUPACION_ESPECIFICA
        ORDER BY hc.fecha_inicio DESC
      `;
      const [lista]: any = await pool.query(query, [
        rpes_trabajadores,
        actividad_rel,
      ]);

      if (!lista.length) {
        res.status(404).json({ message: "No se encontraron datos." });
        return;
      }

      const pdfMaestro = await PDFDocument.create();
      const fuente = await pdfMaestro.embedFont(StandardFonts.HelveticaBold);

      for (const trabajador of lista) {
        const pdfIndividual = await this.cargarPlantillaLimpia();
        
        // Cargamos las DOS fuentes para cada PDF individual
        const fuenteNormalInd = await pdfIndividual.embedFont(StandardFonts.Helvetica);
        const fuenteNegritaInd = await pdfIndividual.embedFont(StandardFonts.HelveticaBold);
        
        const paginaInd = pdfIndividual.getPages()[0];

        // Pasamos ambas fuentes al inyector
        await this.inyectarDatosEnPDF(paginaInd, fuenteNormalInd, fuenteNegritaInd, trabajador, firmas);

        const [paginaCopiada] = await pdfMaestro.copyPages(pdfIndividual, [0]);
        pdfMaestro.addPage(paginaCopiada);
      }

      const pdfBytes = await pdfMaestro.save();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="DC3_LOTE_${actividad_rel}.pdf"`,
      );
      res.send(Buffer.from(pdfBytes));
    } catch (error: any) {
      console.error("❌ Error Lote:", error);
      res.status(500).json({ message: "Error interno" });
    }
  };

  // ====================================================================
  // MÉTODO ORIGINAL: GENERAR WORD (RESTAURADO COMPLETO)
  // ====================================================================
  public generarDocumento = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const {
      rpe_trabajador,
      clave_curso,
      puesto_en_constancia,
      clave_ocupacion,
      clave_area_stps,
    } = req.body;

    try {
      const qTrabajador = "SELECT * FROM trabajadores WHERE RPE = ?";
      const [trab]: any = await pool.query(qTrabajador, [rpe_trabajador]);

      const qCurso = "SELECT * FROM cursos WHERE CLAVE_CURSO = ?";
      const [curso]: any = await pool.query(qCurso, [clave_curso]);

      const qFechas =
        "SELECT fecha_inicio, fecha_termino FROM historial_capacitacion WHERE rpe_trabajador = ? AND clave_curso_rel = ?";
      const [fechas]: any = await pool.query(qFechas, [
        rpe_trabajador,
        clave_curso,
      ]);

      let textoOcupacion = "";
      if (clave_ocupacion) {
        const qOcup =
          "SELECT ocupacion_especifica FROM ocupaciones WHERE clave = ?";
        const [ocupRows]: any = await pool.query(qOcup, [clave_ocupacion]);
        if (ocupRows.length > 0)
          textoOcupacion = ocupRows[0].ocupacion_especifica;
        else textoOcupacion = clave_ocupacion;
      }

      let textoArea = "";
      if (clave_area_stps) {
        const qArea = "SELECT nombre_area FROM areas_tematicas WHERE clave = ?";
        const [areaRows]: any = await pool.query(qArea, [clave_area_stps]);
        if (areaRows.length > 0)
          textoArea = `${clave_area_stps} - ${areaRows[0].nombre_area}`;
        else textoArea = clave_area_stps;
      }

      if (!trab[0] || !curso[0]) {
        res.status(404).json({ message: "Faltan datos" });
        return;
      }

      const fechaInicioRaw = fechas[0] ? fechas[0].fecha_inicio : null;
      const fechaTerminoRaw = fechas[0] ? fechas[0].fecha_termino : null;

      const nombreDesglosado = this.desglosarNombre(trab[0].NOMBRE_COMPLETO);
      const curpDesglosado = this.separarCaracteres(trab[0].CURP, "c");
      const rfcDesglosado = this.separarCaracteres(trab[0].RFC || "", "r");
      const inicioDesglosado = this.desglosarFecha(fechaInicioRaw, "i");
      const finDesglosado = this.desglosarFecha(fechaTerminoRaw, "f");

      const datosFinales = {
        empresa: "COMISIÓN FEDERAL DE ELECTRICIDAD",
        rfc_empresa: "CFE370814QI0",
        ...nombreDesglosado,
        ...curpDesglosado,
        ...rfcDesglosado,
        ...inicioDesglosado,
        ...finDesglosado,
        curso: curso[0].NOMBRE_DEL_CURSO,
        duracion: curso[0].DURACION_REAL_HRS || "0",
        puesto: puesto_en_constancia || "",
        ocupacion: textoOcupacion,
        area: textoArea,
        instructor: "Instructores Internos CFE",
      };

      const rutaPlantillaWord = path.resolve(
        __dirname,
        "../../plantillas/DC3 MACHOTE Editableprueba.docx",
      );

      if (!fs.existsSync(rutaPlantillaWord)) {
        res.status(500).json({ message: "Plantilla Word no encontrada" });
        return;
      }

      const content = fs.readFileSync(rutaPlantillaWord, "binary");
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "",
      });

      doc.render(datosFinales);

      const buf = doc
        .getZip()
        .generate({ type: "nodebuffer", compression: "DEFLATE" });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=DC3_${rpe_trabajador}.docx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.send(buf);
    } catch (error) {
      console.error("Error generando Word:", error);
      res.status(500).json({ message: "Error interno" });
    }
  };

  // ====================================================================
  // GENERAR PDF MANUAL (Sin consultar Base de Datos)
  // ====================================================================
  public generarPdfManual = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { trabajador, curso, firmas } = req.body;

      if (!trabajador || !curso) {
        res
          .status(400)
          .json({ message: "Faltan datos del trabajador o curso." });
        return;
      }

      // "Engañamos" al inyector pasándole los datos exactamente como si vinieran de la BD
      const datosSimulados = {
        NOMBRE_COMPLETO: trabajador.nombre,
        CURP: trabajador.curp,
        RPE: trabajador.rpe,
        puesto_en_constancia: trabajador.puesto,
        OCUPACION_ESPECIFICA: trabajador.ocupacion,
        NOMBRE_DEL_CURSO: curso.nombre,
        DURACION_REAL_HRS: curso.duracion,
        fecha_inicio: curso.fecha_inicio,
        fecha_termino: curso.fecha_termino,
        AREA_TEMATICA: curso.area,
      };

      const pdfDoc = await this.cargarPlantillaLimpia();
      
      // Cargamos las DOS fuentes para el PDF manual
      const fuenteNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fuenteNegrita = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pagina = pdfDoc.getPages()[0];

      // Pasamos ambas fuentes junto con los datos simulados
      await this.inyectarDatosEnPDF(pagina, fuenteNormal, fuenteNegrita, datosSimulados, firmas);

      const pdfBytes = await pdfDoc.save();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="DC3_MANUAL_${trabajador.rpe || "NUEVO"}.pdf"`,
      );
      res.send(Buffer.from(pdfBytes));
    } catch (error: any) {
      console.error("❌ Error PDF Manual:", error);
      res.status(500).json({ message: "Error interno al generar PDF manual" });
    }
  };

  // ====================================================================
  // MERGE PDFs — fusiona varios PDFs en uno solo
  // Recibe los PDFs como multipart/form-data, campo "pdfs"
  // ====================================================================
  public mergePdfs = async (req: Request, res: Response): Promise<void> => {
    try {
      // ✅ CORRECCIÓN: Le decimos a TypeScript que confíe en que req trae "files"
      const archivos = (req as any).files as
        | Array<{ buffer: Buffer; originalname: string }>
        | undefined;
        
      if (!archivos?.length) {
        res.status(400).json({ message: "No se recibieron archivos PDF." });
        return;
      }

      const pdfMaestro = await PDFDocument.create();

      for (const archivo of archivos) {
        try {
          const docOrigen = await PDFDocument.load(archivo.buffer, {
            ignoreEncryption: true,
          });
          const indices = docOrigen.getPageIndices();
          const copias = await pdfMaestro.copyPages(docOrigen, indices);
          copias.forEach((p) => pdfMaestro.addPage(p));
        } catch (e) {
          console.warn(
            "[Merge] Saltando archivo inválido:",
            archivo.originalname,
          );
        }
      }

      if (pdfMaestro.getPageCount() === 0) {
        res.status(400).json({ message: "Ningún PDF válido para fusionar." });
        return;
      }

      const pdfBytes = await pdfMaestro.save();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="DC3_LOTE_MANUAL.pdf"`,
      );
      res.send(Buffer.from(pdfBytes));
    } catch (error: any) {
      console.error("❌ Error merge PDFs:", error);
      res.status(500).json({ message: "Error al fusionar PDFs." });
    }
  };
}

const constanciasController = new ConstanciasController();
export default constanciasController;
