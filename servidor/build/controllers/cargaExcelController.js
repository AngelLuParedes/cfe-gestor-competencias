import * as XLSX from 'xlsx';
// ── Pool ──────────────────────────────────────────────────────────────────────
let pool;
export const setPool = (p) => {
    pool = p;
    console.log('[CargaExcel] ✅ setPool recibido');
};
// ── Helpers ───────────────────────────────────────────────────────────────────
function excelSerialToDate(serial) {
    if (!serial || isNaN(serial))
        return null;
    return new Date(Date.UTC(1899, 11, 30 + serial)).toISOString().slice(0, 10);
}
function str(val) {
    if (val === null || val === undefined || val === '')
        return null;
    return String(val).trim();
}
function num(val) {
    const n = Number(val);
    return isNaN(n) ? null : n;
}
// 🚀 ESCUDO ANTI-1899: Si la fecha no sirve, devuelve null matemáticamente
function fechaStr(val) {
    if (val === null || val === undefined || val === '')
        return null;
    // Si Excel lo manda como número serial
    if (typeof val === 'number') {
        if (val < 10000)
            return null; // Destruye fechas cercanas a 1900/1899 automáticamente
        return excelSerialToDate(val);
    }
    const s = String(val).trim();
    // Bloqueo explícito de basura de CFE
    if (s.toUpperCase() === 'N/D' || s.toUpperCase() === 'N/A' || s === '0')
        return null;
    if (s.includes('/')) {
        const partes = s.split('/');
        if (partes.length === 3) {
            const dia = (partes[0] || '').padStart(2, '0');
            const mes = (partes[1] || '').padStart(2, '0');
            let anio = (partes[2] || '');
            if (anio.length === 2)
                anio = '20' + anio;
            // Escudo extra: si el año resultante es absurdo (< 1990), descartamos
            const anioNum = parseInt(anio, 10);
            if (isNaN(anioNum) || anioNum < 1990)
                return null;
            return `${anio}-${mes}-${dia}`;
        }
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
// 🚀 FECHA DE INICIO AUTOMÁTICA: dado un total de horas, calcula cuántas
// jornadas de 8 hrs tomó el curso (mínimo 1 día, redondeando hacia arriba).
// Ej: 24 hrs -> 3 jornadas | 12 hrs -> 2 jornadas | 6 hrs -> 1 jornada.
function diasDeCurso(horas) {
    if (!horas || horas <= 0)
        return 1;
    return Math.max(1, Math.ceil(horas / 8));
}
// Resta días HÁBILES (saltando sábado y domingo) a una fecha "YYYY-MM-DD".
// Se usa para ir de la fecha de acreditación (fecha_termino) hacia atrás y
// obtener la fecha_inicio real del curso, sin caer en fin de semana.
function restarDiasHabiles(fechaISO, diasARestar) {
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, (mes - 1), dia));
    let restantes = diasARestar;
    while (restantes > 0) {
        fecha.setUTCDate(fecha.getUTCDate() - 1);
        const diaSemana = fecha.getUTCDay(); // 0 = domingo, 6 = sábado
        if (diaSemana !== 0 && diaSemana !== 6) {
            restantes--;
        }
    }
    return fecha.toISOString().slice(0, 10);
}
function normalizar(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
// ── Parsers ───────────────────────────────────────────────────────────────────
function parsearEstandar(buffer) {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    if (!wb.SheetNames.length)
        throw new Error('El archivo no tiene hojas.');
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: true });
}
function parsearCCHL(buffer) {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    if (!wb.SheetNames.length)
        throw new Error('El archivo no tiene hojas.');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rangoHeader = detectarFilaHeaders(sheet);
    return XLSX.utils.sheet_to_json(sheet, {
        defval: null, raw: true, range: rangoHeader
    });
}
function detectarFilaHeaders(sheet, maxFilas = 15) {
    const ref = sheet['!ref'];
    if (!ref)
        return 8;
    for (let row = 0; row < maxFilas; row++) {
        for (let col = 0; col < 20; col++) {
            const addr = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[addr];
            if (!cell)
                continue;
            const val = normalizar(String(cell.v ?? ''));
            if (val === 'ACTIVIDAD') {
                return row;
            }
        }
    }
    return 8;
}
function esCCHL(buffer) {
    try {
        const wb = XLSX.read(buffer, { type: 'buffer', sheetRows: 12 });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet)
            return false;
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 4; col++) {
                const addr = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = sheet[addr];
                if (!cell)
                    continue;
                const val = normalizar(String(cell.v ?? ''));
                if (val.includes('COMISION') && val.includes('ELECTR'))
                    return true;
                if (val.includes('CCHL'))
                    return true;
            }
        }
        return false;
    }
    catch {
        return false;
    }
}
function validar(filas, cols) {
    if (!filas.length)
        throw new Error('El archivo no contiene datos.');
    const presentes = Object.keys(filas[0]);
    const faltan = cols.filter(c => !presentes.includes(c));
    if (faltan.length)
        throw new Error(`Columnas faltantes: ${faltan.join(', ')}`);
}
// ── UPSERT genérico ───────────────────────────────────────────────────────────
const LOTE = 500;
async function upsertLote(filas, sql, ignorar = []) {
    if (!pool)
        throw new Error('Pool no inicializado. Revisa setPool() en index.ts.');
    let insertados = 0;
    let actualizados = 0;
    for (let i = 0; i < filas.length; i += LOTE) {
        for (const fila of filas.slice(i, i + LOTE)) {
            try {
                const [h] = await pool.execute(sql, fila);
                if (h.affectedRows === 1)
                    insertados++;
                else if (h.affectedRows === 2)
                    actualizados++;
            }
            catch (e) {
                if (!ignorar.includes(e.errno ?? -1)) {
                    console.error('[CargaExcel] ❌ errno:', e.errno, '| sql err:', e.message);
                    throw e;
                }
            }
        }
    }
    return { insertados, actualizados, omitidos: filas.length - insertados - actualizados };
}
// ── Diagnóstico ───────────────────────────────────────────────────────────────
export const diagnostico = async (_req, res) => {
    const r = { pool_inicializado: !!pool };
    if (!pool) {
        r['solucion'] = 'Falta setPool(pool) en index.ts';
        res.json(r);
        return;
    }
    try {
        const [dbRows] = await pool.execute('SELECT DATABASE() AS db');
        r['base_de_datos'] = dbRows[0]?.db;
        const [tablas] = await pool.execute(`SELECT table_name FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN ('cursos','trabajadores','historial_capacitacion')`);
        r['tablas'] = tablas.map((t) => t.table_name);
        const cuentas = {};
        for (const t of ['cursos', 'trabajadores', 'historial_capacitacion']) {
            const [rows] = await pool.execute(`SELECT COUNT(*) AS n FROM \`${t}\``);
            cuentas[t] = rows[0]?.n;
        }
        r['registros'] = cuentas;
        await pool.execute(`INSERT INTO cursos (ACTIVIDAD, NOMBRE_DEL_CURSO) VALUES (?,?)
       ON DUPLICATE KEY UPDATE NOMBRE_DEL_CURSO = VALUES(NOMBRE_DEL_CURSO)`, ['__DIAG_TEST__', '__DIAG_TEST__']);
        await pool.execute(`DELETE FROM cursos WHERE ACTIVIDAD = ?`, ['__DIAG_TEST__']);
        r['escritura'] = '✅ INSERT+DELETE exitosos';
    }
    catch (e) {
        r['error'] = e.message;
        r['errno'] = e.errno;
    }
    res.json(r);
};
// ── Carga completa (reporte CCHL → 3 tablas) ─────────────────────────────────
export const cargarCompleto = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ mensaje: 'No se recibió archivo.' });
            return;
        }
        if (!pool) {
            res.status(500).json({ mensaje: 'Pool no inicializado.' });
            return;
        }
        const esCCHLfmt = esCCHL(req.file.buffer);
        let filas = esCCHLfmt ? parsearCCHL(req.file.buffer) : parsearEstandar(req.file.buffer);
        // =================================================================
        // 🚀 NUEVO FILTRO MASIVO SELLADO (SIN REGEX)
        // =================================================================
        filas = filas.filter(f => {
            // Intentamos sacar la fecha primero que nada
            const fechaCruda = f['FECHA TÉRMINO'] ?? f['FECHA DE TÉRMINO'] ?? f['FECHA TERMINO'] ?? f['FECHA INICIO'] ?? f['FECHA DE INICIO'];
            const fechaValida = fechaStr(fechaCruda);
            // Si no hay fecha válida bajo ninguna circunstancia, se elimina la fila completa.
            if (!fechaValida)
                return false;
            // Cortamos los primeros 4 dígitos que sabemos que son el año porque fechaStr devuelve YYYY-MM-DD
            const anio = parseInt(fechaValida.substring(0, 4), 10);
            // Si el año es viejo o inválido, a la basura.
            if (isNaN(anio) || anio < 2021)
                return false;
            return true; // Solo pasan registros con fechas inmaculadas de 2021 en adelante
        });
        if (filas.length === 0) {
            res.json({ mensaje: 'El archivo solo contenía datos anteriores a 2021 o fechas inválidas. No se cargó nada nuevo.' });
            return;
        }
        // =================================================================
        const cursosMap = new Map();
        for (const f of filas) {
            const act = str(f['ACTIVIDAD']);
            if (act && !cursosMap.has(act)) {
                cursosMap.set(act, [
                    str(f['SUBPROCESO']),
                    str(f['CLAVE DEL ÁREA']) ?? str(f['CLAVE DEL AREA']),
                    str(f['ÁREA']) ?? str(f['AREA']),
                    num(f['AÑO']) ?? num(f['AÑO ']),
                    act,
                    str(f['CLAVE ACTIVIDAD']),
                    str(f['CLAVE CURSO']),
                    str(f['NOMBRE DEL CURSO']),
                    num(f['DURACIÓN REAL HRS.']) ?? num(f['DURACION REAL HRS.']),
                    null
                ]);
            }
        }
        const trabMap = new Map();
        for (const f of filas) {
            const rpe = str(f['RPE']);
            if (rpe && !trabMap.has(rpe)) {
                trabMap.set(rpe, [rpe, str(f['CURP']), str(f['NOMBRE COMPLETO']), null, null]);
            }
        }
        const historial = filas.map(f => {
            const fTermino = fechaStr(f['FECHA TÉRMINO'] ?? f['FECHA DE TÉRMINO'] ?? f['FECHA TERMINO']);
            const fInicio = fechaStr(f['FECHA INICIO'] ?? f['FECHA DE INICIO']) || fTermino; // Fallback para no guardar nulos
            return [
                str(f['RPE']),
                str(f['ACTIVIDAD']),
                fInicio,
                fTermino,
                num(f['CALIFICACIÓN']) ?? num(f['CALIFICACION']) ?? 100,
                str(f['ESTADO CCHL']) || 'APROBADO'
            ];
        }).filter(h => h[3] !== null); // Doble chequeo para evitar el 0000-00-00
        const regCursos = Array.from(cursosMap.values());
        const regTrab = Array.from(trabMap.values());
        const resCursos = await upsertLote(regCursos, `INSERT INTO cursos
         (SUBPROCESO,CLAVE_DEL_AREA,AREA,\`AÑO\`,ACTIVIDAD,
          CLAVE_ACTIVIDAD,CLAVE_CURSO,NOMBRE_DEL_CURSO,
          DURACION_REAL_HRS,clave_area_stps)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         SUBPROCESO       = VALUES(SUBPROCESO),
         CLAVE_DEL_AREA   = VALUES(CLAVE_DEL_AREA),
         AREA             = VALUES(AREA),
         \`AÑO\`          = VALUES(\`AÑO\`),
         CLAVE_ACTIVIDAD  = VALUES(CLAVE_ACTIVIDAD),
         CLAVE_CURSO      = VALUES(CLAVE_CURSO),
         NOMBRE_DEL_CURSO = VALUES(NOMBRE_DEL_CURSO),
         DURACION_REAL_HRS= VALUES(DURACION_REAL_HRS)`);
        const resTrab = await upsertLote(regTrab, `INSERT INTO trabajadores
         (RPE,CURP,NOMBRE_COMPLETO,PUESTO,OCUPACION_ESPECIFICA)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         CURP            = VALUES(CURP),
         NOMBRE_COMPLETO = VALUES(NOMBRE_COMPLETO)`);
        const resHist = await upsertLote(historial, `INSERT IGNORE INTO historial_capacitacion
         (rpe_trabajador,actividad_rel,fecha_inicio,
          fecha_termino,calificacion,estado_cchl)
       VALUES (?,?,?,?,?,?)`, [1062, 1452]);
        res.json({
            mensaje: `Carga completada. ${filas.length} filas procesadas exitosamente.`,
            cursos: resCursos,
            trabajadores: resTrab,
            historial: resHist,
            totalInsertados: resCursos.insertados + resTrab.insertados + resHist.insertados,
            totalActualizados: resCursos.actualizados + resTrab.actualizados,
            totalOmitidos: resCursos.omitidos + resTrab.omitidos + resHist.omitidos,
            totalFilas: filas.length
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido.';
        console.error('[CargaExcel] ❌', msg);
        res.status(msg.includes('Columnas') ? 400 : 500).json({ mensaje: msg });
    }
};
// ── Controladores individuales ────────────────────────────────────────────────
export const cargarCursos = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ mensaje: 'No se recibió archivo.' });
            return;
        }
        if (!pool) {
            res.status(500).json({ mensaje: 'Pool no inicializado.' });
            return;
        }
        const filas = parsearEstandar(req.file.buffer);
        validar(filas, ['ACTIVIDAD', 'NOMBRE_DEL_CURSO']);
        const registros = filas.map(f => [
            str(f['SUBPROCESO']), str(f['CLAVE_DEL_AREA']), str(f['AREA']), num(f['AÑO']),
            str(f['ACTIVIDAD']), str(f['CLAVE_ACTIVIDAD']), str(f['CLAVE_CURSO']),
            str(f['NOMBRE_DEL_CURSO']), num(f['DURACION_REAL_HRS']), str(f['clave_area_stps'])
        ]);
        const r = await upsertLote(registros, `INSERT INTO cursos
         (SUBPROCESO,CLAVE_DEL_AREA,AREA,\`AÑO\`,ACTIVIDAD,
          CLAVE_ACTIVIDAD,CLAVE_CURSO,NOMBRE_DEL_CURSO,
          DURACION_REAL_HRS,clave_area_stps)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         SUBPROCESO       = VALUES(SUBPROCESO),
         CLAVE_DEL_AREA   = VALUES(CLAVE_DEL_AREA),
         AREA             = VALUES(AREA),
         \`AÑO\`          = VALUES(\`AÑO\`),
         CLAVE_ACTIVIDAD  = VALUES(CLAVE_ACTIVIDAD),
         CLAVE_CURSO      = VALUES(CLAVE_CURSO),
         NOMBRE_DEL_CURSO = VALUES(NOMBRE_DEL_CURSO),
         DURACION_REAL_HRS= VALUES(DURACION_REAL_HRS)`);
        res.json({ mensaje: 'Carga de cursos completada.', insertados: r.insertados + r.actualizados, omitidos: r.omitidos });
    }
    catch (err) {
        const m = err instanceof Error ? err.message : 'Error desconocido.';
        res.status(m.includes('Columnas') ? 400 : 500).json({ mensaje: m });
    }
};
export const cargarTrabajadores = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ mensaje: 'No se recibió archivo.' });
            return;
        }
        if (!pool) {
            res.status(500).json({ mensaje: 'Pool no inicializado.' });
            return;
        }
        const filas = parsearEstandar(req.file.buffer);
        validar(filas, ['RPE', 'CURP', 'NOMBRE_COMPLETO']);
        const registros = filas.map(f => [
            str(f['RPE']), str(f['CURP']), str(f['NOMBRE_COMPLETO']),
            str(f['PUESTO']), str(f['OCUPACION_ESPECIFICA'])
        ]);
        const r = await upsertLote(registros, `INSERT INTO trabajadores
         (RPE,CURP,NOMBRE_COMPLETO,PUESTO,OCUPACION_ESPECIFICA)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         CURP            = VALUES(CURP),
         NOMBRE_COMPLETO = VALUES(NOMBRE_COMPLETO)`);
        res.json({ mensaje: 'Carga de trabajadores completada.', insertados: r.insertados + r.actualizados, omitidos: r.omitidos });
    }
    catch (err) {
        const m = err instanceof Error ? err.message : 'Error desconocido.';
        res.status(m.includes('Columnas') ? 400 : 500).json({ mensaje: m });
    }
};
export const cargarHistorial = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ mensaje: 'No se recibió archivo.' });
            return;
        }
        if (!pool) {
            res.status(500).json({ mensaje: 'Pool no inicializado.' });
            return;
        }
        const filas = parsearEstandar(req.file.buffer);
        validar(filas, ['rpe_trabajador', 'actividad_rel']);
        const registros = filas.map(f => [
            str(f['rpe_trabajador']), str(f['actividad_rel']),
            fechaStr(f['fecha_inicio']), fechaStr(f['fecha_termino']),
            num(f['calificacion']), str(f['estado_cchl'])
        ]);
        const r = await upsertLote(registros, `INSERT IGNORE INTO historial_capacitacion
         (rpe_trabajador,actividad_rel,fecha_inicio,
          fecha_termino,calificacion,estado_cchl)
       VALUES (?,?,?,?,?,?)`, [1062, 1452]);
        res.json({ mensaje: 'Carga de historial completada.', insertados: r.insertados, omitidos: r.omitidos });
    }
    catch (err) {
        const m = err instanceof Error ? err.message : 'Error desconocido.';
        res.status(m.includes('Columnas') ? 400 : 500).json({ mensaje: m });
    }
};
export const cargarKardex = async (req, res) => {
    try {
        // 💥 PRUEBA DE FUEGO PARA VER SI EL SERVIDOR SE ACTUALIZA
        console.log("=====================================================");
        console.log("🚀🚀🚀 EJECUTANDO EL CÓDIGO NUEVO (ANTI-1899) 🚀🚀🚀");
        console.log("=====================================================");
        if (!req.file) {
            res.status(400).json({ mensaje: 'No se recibió archivo.' });
            return;
        }
        if (!pool) {
            res.status(500).json({ mensaje: 'Pool no inicializado.' });
            return;
        }
        const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
        if (!wb.SheetNames.length)
            throw new Error('El archivo no tiene hojas.');
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const celdaRPE = sheet['C8'];
        const rpe_trabajador = str(celdaRPE ? celdaRPE.v : null);
        if (!rpe_trabajador) {
            res.status(400).json({ mensaje: 'No se encontró el RPE en la celda C8.' });
            return;
        }
        // 🔥 LA BOMBA NUCLEAR: El sistema borra el historial viejo automáticamente
        console.log(`[BOMBA NUCLEAR] Limpiando historial de ${rpe_trabajador} en la Base de Datos...`);
        await pool.execute('DELETE FROM historial_capacitacion WHERE rpe_trabajador = ?', [rpe_trabajador]);
        console.log(`✅ Base de datos limpia para ${rpe_trabajador}. Comenzando filtro...`);
        const [rowsCursos] = await pool.query('SELECT ACTIVIDAD, CLAVE_CURSO FROM cursos');
        const mapaCursos = new Map();
        for (const c of rowsCursos) {
            if (c.CLAVE_CURSO)
                mapaCursos.set(String(c.CLAVE_CURSO).trim().toUpperCase(), c.ACTIVIDAD);
        }
        const registrosHistorial = [];
        const cursosDetectados = [];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1000');
        const maxRow = range.e.r + 1;
        let aprobados = 0;
        let bloqueados = 0;
        for (let row = 12; row <= maxRow; row++) {
            const celdaCurso = sheet['C' + row];
            const nombreTexto = str(celdaCurso ? celdaCurso.v : null);
            if (!nombreTexto)
                continue;
            const celdaFecha = sheet['H' + row];
            // ⚠️ Usamos SIEMPRE .v (número serial de Excel) para que el escudo < 10000
            // de fechaStr() funcione. Si usamos .w (texto formateado) puede llegar
            // "30/11/1899" como string y saltarse el filtro numérico.
            const fechaCruda = celdaFecha ? celdaFecha.v : null;
            // FILTRO 1: Fecha vacía o N/D
            if (!fechaCruda || String(fechaCruda).trim().toUpperCase() === 'N/D' || String(fechaCruda).trim() === '') {
                bloqueados++;
                continue;
            }
            const fechaAcreditacion = fechaStr(fechaCruda);
            if (!fechaAcreditacion) {
                bloqueados++;
                continue;
            }
            // FILTRO 2: Matemático (Menor a 2021)
            const anioAcreditacion = parseInt(fechaAcreditacion.substring(0, 4), 10);
            if (isNaN(anioAcreditacion) || anioAcreditacion < 2021) {
                bloqueados++;
                continue;
            }
            aprobados++; // Si sobrevive, es un curso válido y reciente
            const partes = nombreTexto.split(' ');
            const primerParte = partes[0] || '';
            const claveDTC = primerParte.trim().toUpperCase();
            const nombreCursoReal = nombreTexto.replace(primerParte, '').trim();
            const celdaCalif = sheet['I' + row];
            const calificacion = num(celdaCalif ? celdaCalif.v : 100) || 100;
            const celdaDuracion = sheet['D' + row];
            const duracionHoras = num(celdaDuracion ? celdaDuracion.v : null) || null;
            // 🚀 FECHA DE INICIO CALCULADA: la fecha que trae el Excel (columna H)
            // es la de acreditación/término. A partir de la duración en horas
            // calculamos cuántas jornadas de 8 hrs tomó el curso y restamos esos
            // días hábiles (sin contar sábado/domingo) para obtener fecha_inicio.
            const jornadas = diasDeCurso(duracionHoras);
            const fechaInicioCalculada = jornadas > 1
                ? restarDiasHabiles(fechaAcreditacion, jornadas - 1)
                : fechaAcreditacion;
            let actividad_rel = mapaCursos.get(claveDTC);
            if (!actividad_rel) {
                actividad_rel = claveDTC;
                mapaCursos.set(claveDTC, actividad_rel);
            }
            // 🚀 FIX HORAS DINÁMICAS: antes solo se guardaba la duración cuando el curso
            // era nuevo (el INSERT IGNORE descartaba la fila si el curso ya existía,
            // así que la duración quedaba "pegada" al valor de la primera carga).
            // Ahora se registra la duración de CADA fila (curso nuevo o existente)
            // para poder actualizarla con el valor real de este kardex.
            cursosDetectados.push([actividad_rel, claveDTC, nombreCursoReal, duracionHoras]);
            registrosHistorial.push([
                rpe_trabajador, actividad_rel, fechaInicioCalculada,
                fechaAcreditacion, calificacion, 'APROBADO'
            ]);
        }
        console.log(`📊 RESULTADO: ${aprobados} Cursos Excelentes | ${bloqueados} Cursos Basura Bloqueados`);
        if (registrosHistorial.length === 0) {
            res.status(400).json({ mensaje: 'No se encontraron cursos de 2021 en adelante válidos para cargar.' });
            return;
        }
        if (cursosDetectados.length > 0) {
            // 🚀 UPSERT en lugar de INSERT IGNORE: si el curso ya existe, actualizamos
            // su duración con el valor real de este kardex (COALESCE evita pisar un
            // dato bueno con NULL si esta fila en particular no trae duración).
            await upsertLote(cursosDetectados, `INSERT INTO cursos (ACTIVIDAD, CLAVE_CURSO, NOMBRE_DEL_CURSO, DURACION_REAL_HRS)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           DURACION_REAL_HRS = COALESCE(VALUES(DURACION_REAL_HRS), DURACION_REAL_HRS),
           NOMBRE_DEL_CURSO  = VALUES(NOMBRE_DEL_CURSO)`);
        }
        const r = await upsertLote(registrosHistorial, `INSERT IGNORE INTO historial_capacitacion (rpe_trabajador,actividad_rel,fecha_inicio,fecha_termino,calificacion,estado_cchl) VALUES (?,?,?,?,?,?)`, [1062]);
        res.json({ mensaje: `¡Kardex procesado! RPE: ${rpe_trabajador}`, insertados: r.insertados, omitidos: r.omitidos });
    }
    catch (err) {
        const m = err instanceof Error ? err.message : 'Error desconocido.';
        console.error('[CargaExcel Kardex] ❌', m);
        res.status(500).json({ mensaje: m });
    }
};
//# sourceMappingURL=cargaExcelController.js.map