import { Request, Response } from "express";
import pool from "../database.js";

async function obtenerDatosProcesados(mesFiltro: number | null = null) {
  // 1. Consultas principales
  const queryHistorial = `SELECT rpe_trabajador, id_registro, fecha_inicio, fecha_termino, calificacion, estado_cchl, actividad_rel FROM historial_capacitacion WHERE fecha_termino IS NOT NULL`;
  const queryTrabajadores = `SELECT RPE, NOMBRE_COMPLETO, PUESTO, OCUPACION_ESPECIFICA FROM trabajadores`;
  // 🚀 CAMBIO CLAVE: Ahora traemos el cruce exacto entre el Puesto y el Curso
  const queryBateriasCursos = `SELECT nombre_puesto, clave_curso, vigencia_anios FROM baterias_cursos`; 
  const queryPuente = `SELECT ACTIVIDAD, CLAVE_CURSO, NOMBRE_DEL_CURSO FROM cursos`;

  const [historial]: any = await pool.query(queryHistorial);
  const [trabajadores]: any = await pool.query(queryTrabajadores);
  const [bateriasCursos]: any = await pool.query(queryBateriasCursos);
  
  let puente = [];
  try {
    const [puenteData]: any = await pool.query(queryPuente);
    puente = puenteData;
  } catch (e) {
    console.log("❌ Error: No encontré la tabla puente.");
  }

  // 2. Mapeo de Trabajadores
  const mapaTrabajadores = new Map();
  for (const t of trabajadores) {
    if (t.RPE) mapaTrabajadores.set(String(t.RPE).trim().toUpperCase(), t);
  }

  // 3. Mapeo de Cursos (actividad corta F00... -> clave larga DTC...)
  const mapaPuente = new Map();
  for (const p of puente) {
    if (p.ACTIVIDAD) {
      mapaPuente.set(String(p.ACTIVIDAD).trim().toUpperCase(), {
        claveLarga: p.CLAVE_CURSO ? String(p.CLAVE_CURSO).trim().toUpperCase() : '',
        nombreCurso: p.NOMBRE_DEL_CURSO || 'Curso sin nombre'
      });
    }
  }

  // 4. 🚀 MAPEO INTELIGENTE DE BATERÍAS POR PUESTO
  // Creamos un "diccionario" donde buscamos un Puesto y nos devuelve todos sus cursos obligatorios
  const mapaCursosPorPuesto = new Map();
  for (const bc of bateriasCursos) {
    const puesto = bc.nombre_puesto ? String(bc.nombre_puesto).trim().toUpperCase() : '';
    const claveCurso = bc.clave_curso ? String(bc.clave_curso).trim().toUpperCase() : '';
    const vigencia = Number(bc.vigencia_anios) || 0;

    if (puesto && claveCurso) {
      if (!mapaCursosPorPuesto.has(puesto)) {
        mapaCursosPorPuesto.set(puesto, new Map());
      }
      // Guardamos la clave del curso y los años que le aplican a ESE puesto específicamente
      mapaCursosPorPuesto.get(puesto).set(claveCurso, vigencia);
    }
  }

  const ahora = new Date();
  const trabajadoresResultadoMap = new Map();

  // 5. Procesamiento del Historial (Evaluación final)
  for (const registro of historial) {
    const rpeOriginal = registro.rpe_trabajador;
    if (!rpeOriginal || !registro.id_registro) continue;

    const rpeLimpio = String(rpeOriginal).trim().toUpperCase();
    const infoTrabajador = mapaTrabajadores.get(rpeLimpio);
    
    // Si no tenemos info del trabajador o no tiene puesto asignado, no podemos saber su batería
    if (!infoTrabajador || !infoTrabajador.PUESTO) continue;

    const puestoTrabajador = String(infoTrabajador.PUESTO).trim().toUpperCase();
    const bateriaDelPuesto = mapaCursosPorPuesto.get(puestoTrabajador);

    // Si el puesto del trabajador no tiene una batería configurada en la BD, lo saltamos
    if (!bateriaDelPuesto) continue;

    const actividadCorta = registro.actividad_rel ? String(registro.actividad_rel).trim().toUpperCase() : '';
    const datosPuente = mapaPuente.get(actividadCorta);
    const claveLarga = datosPuente ? datosPuente.claveLarga : '';
    const nombreCursoCorrecto = datosPuente ? datosPuente.nombreCurso : 'Curso fuera de catálogo';

    // 🚦 EL FILTRO ABSOLUTO: 
    // ¿Este curso que tomó el trabajador existe dentro de la batería obligatoria de su puesto?
    if (!claveLarga || !bateriaDelPuesto.has(claveLarga)) {
      continue; // Si el curso no es de su batería, lo ignoramos por completo y pasamos al siguiente.
    }

    // Tomamos la vigencia exacta que dicta su batería
    const vigenciaAplicada = bateriaDelPuesto.get(claveLarga); 

    let estado = "VIGENTE";
    let fechaVencimientoStr = "No caduca";
    let diasRestantes = null;
    let diferenciaTiempo = 1; 

    // Calculamos caducidades SOLO si el curso tiene años de vigencia > 0
    if (vigenciaAplicada > 0 && registro.fecha_termino) {
        const fechaTermino = new Date(registro.fecha_termino);
        if (!isNaN(fechaTermino.getTime())) {
            const fechaVencimiento = new Date(fechaTermino);
            fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + vigenciaAplicada);

            if (mesFiltro !== null && (fechaVencimiento.getMonth() + 1) !== mesFiltro) {
                continue; // Si el usuario filtró por un mes distinto, lo ocultamos
            }

            diferenciaTiempo = fechaVencimiento.getTime() - ahora.getTime();
            diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

            try {
                // El || "Error" es el escudo anti-undefined para que TypeScript compile feliz
                fechaVencimientoStr = fechaVencimiento.toISOString().split("T")[0] || "Error";
            } catch(e) {
                fechaVencimientoStr = "Error";
            }
        }
    } else if (mesFiltro !== null) {
       // Si estamos filtrando por un mes específico y este curso NO caduca, lo escondemos
       continue;
    }

    // 🚦 LÓGICA DE ESTADOS:
    // 1. Siempre revisamos primero si está reprobado (incluso si el curso es de 0 años de vigencia)
    if (registro.calificacion !== null && registro.calificacion !== undefined && Number(registro.calificacion) < 80) {
      estado = "REPROBADO";
    } 
    // 2. Si pasó con >= 80, evaluamos sus fechas (si es que caduca)
    else if (vigenciaAplicada > 0) {
        if (diferenciaTiempo < 0) {
          estado = "VENCIDO";
        } else if (diasRestantes !== null && diasRestantes <= 30) {
          estado = "POR_VENCER";
        }
    }

    if (!trabajadoresResultadoMap.has(rpeLimpio)) {
      trabajadoresResultadoMap.set(rpeLimpio, {
        RPE: rpeOriginal,
        NOMBRE_COMPLETO: infoTrabajador.NOMBRE_COMPLETO,
        PUESTO: infoTrabajador.PUESTO,
        OCUPACION_ESPECIFICA: infoTrabajador.OCUPACION_ESPECIFICA,
        cursos: [],
      });
    }

    trabajadoresResultadoMap.get(rpeLimpio).cursos.push({
      id_registro: registro.id_registro,
      nombre_curso: nombreCursoCorrecto,
      clave_curso: claveLarga || actividadCorta,
      fecha_inicio: registro.fecha_inicio,
      fecha_termino: registro.fecha_termino,
      calificacion: registro.calificacion,
      estado_cchl: registro.estado_cchl,
      vigencia_aplicada: vigenciaAplicada,
      fecha_vencimiento: fechaVencimientoStr,
      estado_vigencia: estado,
      dias_restantes: diasRestantes,
    });
  }

  return Array.from(trabajadoresResultadoMap.values());
}

class VigenciaController {
  public async obtenerVigenciaCompleta(req: Request, res: Response) {
    try {
      const resultado = await obtenerDatosProcesados();
      res.json(resultado);
    } catch (error) {
      console.error("❌ Error:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }

  public async obtenerVigenciaPorMes(req: Request, res: Response) {
    try {
      const { mes } = req.params;
      const resultado = await obtenerDatosProcesados(parseInt(mes as string));
      res.json(resultado);
    } catch (error) {
      console.error("❌ Error:", error);
      res.status(500).json({ message: "Error interno" });
    }
  }

  public async obtenerAlertasVigencia(req: Request, res: Response) {
    try {
      const resultado = await obtenerDatosProcesados();
      res.json(resultado);
    } catch (error) {
      console.error("❌ Error:", error);
      res.status(500).json({ message: "Error interno" });
    }
  }
}

const vigenciaController = new VigenciaController();
export default vigenciaController;