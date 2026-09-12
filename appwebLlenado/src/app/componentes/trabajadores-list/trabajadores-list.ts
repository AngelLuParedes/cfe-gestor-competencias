import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrabajadoresService } from '../../servicios/trabajadores';
import { CursosService } from '../../servicios/curso';
import { NotificacionesService } from '../../servicios/notificaciones';
import { CatalogosService } from '../../servicios/catalogo';
import { Modal } from 'bootstrap';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

const CATALOGO_INSTRUCTORES = [
  'INSTRUCTOR INTERNO',
];
const CATALOGO_PATRONES = [
  'ARTURO LLEDIAS SAAVEDRA',
  'ROBERTO SANCHEZ MENDEZ',
  'CARLOS HERRERA FLORES',
];
const CATALOGO_REPRESENTANTES = [
  'CHRISTIAN ALEJANDRO MELENDEZ LONA',
  'MIGUEL TORRES REYES',
  'ANA GARCIA VARGAS',
];

@Component({
  selector: 'app-trabajadores-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trabajadores-list.html',
  styleUrls: ['./trabajadores-list.css'],
})
export class TrabajadoresLista implements OnInit {
  trabajadores: any[] = [];
  trabajadoresFiltrados: any[] = [];
  terminoBusqueda: string = '';
  
  cargando: boolean = true; 

  trabajadorSeleccionado: any = null;
  cursosDelTrabajador: any[] = [];
  
  historialFiltrado: any[] = [];
  terminoBusquedaHistorial: string = '';
  cargandoCursos: boolean = false;

  todosSeleccionados: boolean = false;

  // 🚀 NUEVO: filtro de Batería (dropdown + comparación historial vs. requeridos)
  baterias: any[] = [];
  claveBateriaSeleccionada: any = '';
  cargandoBateria: boolean = false;
  cursosBateriaSeleccionada: any[] = [];
  comparacionBateria: any[] = [];
  resumenBateria = { total: 0, aprobados: 0, pendientes: 0 };

  trabajadorAEditar: any = {};
  listaOcupaciones: any[] = [];

  pdfUrlSegura: SafeResourceUrl | null = null;
  cargandoPdf: boolean = false;
  pdfBlob: Blob | null = null;
  urlTemporal: string = '';
  nombreArchivoPdf: string = 'Documento.pdf';

  catInstructores = CATALOGO_INSTRUCTORES;
  catPatrones = CATALOGO_PATRONES;
  catRepresentantes = CATALOGO_REPRESENTANTES;

  firmas = {
    instructor: CATALOGO_INSTRUCTORES[0],
    patron: CATALOGO_PATRONES[0],
    representante: CATALOGO_REPRESENTANTES[0],
  };

  // 🚀 NUEVAS VARIABLES PARA CREACIÓN DE TRABAJADOR
  trabajadorNuevo: any = {};
  creandoTrabajador: boolean = false;

  constructor(
    private trabajadoresService: TrabajadoresService,
    private cursosService: CursosService,
    private catalogosService: CatalogosService,
    private cdRef: ChangeDetectorRef,
    private noti: NotificacionesService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.obtenerTrabajadores();
    this.cargarOcupaciones();
    this.cargarBaterias();
  }

  // 🚀 NUEVO: catálogo de baterías para el <select> del filtro
  cargarBaterias() {
    fetch('http://localhost:3000/app/catalogos/baterias')
      .then((r) => {
        if (!r.ok) throw new Error('Error al obtener el catálogo de baterías');
        return r.json();
      })
      .then((data) => {
        this.baterias = Array.isArray(data) ? data : [];
        this.cdRef.detectChanges();
      })
      .catch((err) => console.error('Error al cargar baterías:', err));
  }

  cargarOcupaciones() {
    this.catalogosService.getOcupaciones().subscribe({
      next: (res: any) => {
        this.listaOcupaciones = Array.isArray(res) ? res : res.data || [];
      },
      error: (err) => console.error('Error al cargar ocupaciones:', err),
    });
  }

  obtenerTrabajadores() {
    this.cargando = true;
    this.trabajadoresService.getTrabajadores().subscribe({
      next: (res: any) => {
        const datosRaw = Array.isArray(res) ? res : res.data || [];

        this.trabajadores = datosRaw.map((t: any) => ({
          ...t,
          RPE: t.RPE || t.rpe,
          NOMBRE_COMPLETO: t.NOMBRE_COMPLETO || t.nombre_completo,
          CURP: t.CURP || t.curp || 'No disponible',
          PUESTO: t.PUESTO || t.puesto || '',
          OCUPACION_ESPECIFICA: t.OCUPACION_ESPECIFICA || t.ocupacion_especifica || '',
        }));

        this.trabajadoresFiltrados = []; 
        this.cargando = false; 
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar lista:', err);
        this.cargando = false;
        this.cdRef.detectChanges();
      },
    });
  }

  // 🚀 NUEVA FUNCIÓN: Inicializa el objeto limpio para el formulario
  abrirModalCrear() {
    this.trabajadorNuevo = {
      RPE: '',
      NOMBRE_COMPLETO: '',
      CURP: '',
      PUESTO: '',
      OCUPACION_ESPECIFICA: ''
    };
  }

  // 🚀 NUEVA FUNCIÓN: Envía el nuevo registro al servidor
  guardarNuevoTrabajador() {
    if (!this.trabajadorNuevo.RPE || !this.trabajadorNuevo.NOMBRE_COMPLETO) {
      this.noti.mostrarError('Error', 'El RPE y el Nombre Completo son obligatorios.');
      return;
    }

    this.creandoTrabajador = true;

    // Normalizamos los textos a Mayúsculas y removemos espacios vacíos innecesarios
    const payload = {
      RPE: this.trabajadorNuevo.RPE.trim().toUpperCase(),
      NOMBRE_COMPLETO: this.trabajadorNuevo.NOMBRE_COMPLETO.trim().toUpperCase(),
      CURP: this.trabajadorNuevo.CURP?.trim().toUpperCase() || '',
      PUESTO: this.trabajadorNuevo.PUESTO?.trim().toUpperCase() || '',
      OCUPACION_ESPECIFICA: this.trabajadorNuevo.OCUPACION_ESPECIFICA?.trim() || ''
    };

    this.trabajadoresService.createTrabajador(payload).subscribe({
      next: () => {
        this.noti.toastExito('Trabajador creado exitosamente');
        this.obtenerTrabajadores(); // Recarga la lista interna
        
        const modal = document.getElementById('modalCrearTrabajador');
        if (modal) {
          Modal.getInstance(modal)?.hide();
        }
        this.creandoTrabajador = false;
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al crear el trabajador';
        this.noti.mostrarError('Error', msg);
        this.creandoTrabajador = false;
      }
    });
  }

  buscar() {
    const termino = this.terminoBusqueda.toLowerCase().trim();

    if (!termino) {
      this.trabajadoresFiltrados = [];
      return;
    }

    this.trabajadoresFiltrados = this.trabajadores.filter(
      (t) =>
        t.NOMBRE_COMPLETO?.toLowerCase().includes(termino) ||
        t.RPE?.toLowerCase().includes(termino),
    );
  }

  abrirModalEditar(trabajador: any) {
    this.trabajadorAEditar = { ...trabajador };
  }

  guardarEdicion() {
    if (!this.trabajadorAEditar.RPE) return;

    const datosParaEnviar = {
      ...this.trabajadorAEditar,
      PUESTO: this.trabajadorAEditar.PUESTO || '',
      OCUPACION_ESPECIFICA: this.trabajadorAEditar.OCUPACION_ESPECIFICA || '',
      CURP: this.trabajadorAEditar.CURP?.toUpperCase() || '',
    };

    this.trabajadoresService
      .updateTrabajador(this.trabajadorAEditar.RPE, datosParaEnviar)
      .subscribe({
        next: () => {
          this.noti.toastExito('Datos actualizados');
          this.obtenerTrabajadores();
          const modal = document.getElementById('modalEditarTrabajador');
          if (modal) {
            const bsModal = Modal.getInstance(modal);
            bsModal?.hide();
          }
        },
        error: (err) => {
          this.noti.mostrarError('Error', 'No se pudo guardar la información');
        },
      });
  }

  async eliminarTrabajador(rpe: string | undefined) {
    if (!rpe) return;

    const confirmado = await this.noti.confirmarAccion(
      '¿Eliminar Trabajador?',
      `¿Estás seguro de borrar al trabajador con RPE: ${rpe}?`,
      'Sí, eliminar',
    );

    if (confirmado) {
      this.trabajadoresService.deleteTrabajador(rpe).subscribe({
        next: () => {
          this.noti.toastExito('Trabajador eliminado con éxito');
          this.obtenerTrabajadores();
        },
        error: (err) => {
          const msg =
            err.error?.message || 'No se puede eliminar porque tiene historial registrado.';
          this.noti.mostrarError('No se pudo eliminar', msg);
        },
      });
    }
  }

  abrirModalCursos(trabajador: any) {
    this.trabajadorSeleccionado = trabajador;
    this.cursosDelTrabajador = [];
    this.historialFiltrado = [];
    this.terminoBusquedaHistorial = '';
    this.cargandoCursos = true;
    this.todosSeleccionados = false;

    // Reset del filtro de batería cada vez que se abre el modal
    this.claveBateriaSeleccionada = '';
    this.cursosBateriaSeleccionada = [];
    this.comparacionBateria = [];
    this.resumenBateria = { total: 0, aprobados: 0, pendientes: 0 };

    const modalElement = document.getElementById('modalVerCursos');
    if (modalElement) {
      const bsModal = Modal.getOrCreateInstance(modalElement);
      bsModal.show();
    }

    this.trabajadoresService.getCursosPorTrabajador(trabajador.RPE).subscribe({
      next: (res: any) => {
        this.cursosDelTrabajador = (Array.isArray(res) ? res : res.data || []).map((c: any) => ({
          ...c,
          // 🚀 CAMBIO CLAVE: Obligamos a que 'horas' sea el valor individual primero
          horas: c.horas_acreditadas || c.DURACION_REAL_HRS || c.horas || 0,
          seleccionado: false,
        }));
        this.historialFiltrado = [...this.cursosDelTrabajador];
        this.cargandoCursos = false;
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar cursos:', err);
        this.cargandoCursos = false;
        this.cdRef.detectChanges();
        this.noti.mostrarError('Error', 'No se pudo obtener el historial del trabajador');
      },
    });
  }

  buscarHistorial() {
    const termino = this.terminoBusquedaHistorial.toLowerCase().trim();

    if (!termino) {
      this.historialFiltrado = [...this.cursosDelTrabajador];
    } else {
      this.historialFiltrado = this.cursosDelTrabajador.filter((curso) => {
        const nombreCurso = curso.nombre_curso || curso.NOMBRE_DEL_CURSO || '';
        return nombreCurso.toLowerCase().includes(termino);
      });
    }
  }

  // 🚀 NUEVO: al elegir una batería en el <select>, trae sus cursos y compara
  onSeleccionarBateria() {
    this.comparacionBateria = [];
    this.cursosBateriaSeleccionada = [];
    this.resumenBateria = { total: 0, aprobados: 0, pendientes: 0 };

    // Validamos que exista selección (y que sea un objeto con la propiedad clave_bateria)
    if (!this.claveBateriaSeleccionada || !this.claveBateriaSeleccionada.clave_bateria) {
      return;
    }

    this.cargandoBateria = true;

    // Extraemos la información del objeto que capturó el <select>
    const clave = this.claveBateriaSeleccionada.clave_bateria;
    const nombre = this.claveBateriaSeleccionada.nombre_puesto;

    // 🚀 EL FIX CLAVE: Le agregamos el parámetro a la URL para que el backend filtre correctamente
    const url = `http://localhost:3000/app/catalogos/baterias/${clave}/cursos?nombre=${encodeURIComponent(nombre)}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Error al obtener los cursos de la batería');
        return r.json();
      })
      .then((data) => {
        this.cursosBateriaSeleccionada = Array.isArray(data) ? data : [];
        this.compararConBateria();
        this.cargandoBateria = false;
        this.cdRef.detectChanges();
      })
      .catch((err) => {
        console.error('Error al cargar cursos de la batería:', err);
        this.cargandoBateria = false;
        this.cdRef.detectChanges();
        this.noti.mostrarError('Error', 'No se pudieron obtener los cursos de la batería.');
      });
  }

  // 🚀 NUEVO: cruza los cursos requeridos por la batería contra el historial
  // del trabajador. Match por clave_curso O por nombre_curso. Si el trabajador
  // tomó el mismo curso más de una vez, nos quedamos con la fecha_inicio más reciente.
  private compararConBateria() {
    const normalizar = (s: any) => (s ? String(s).trim().toUpperCase() : '');

    this.comparacionBateria = this.cursosBateriaSeleccionada.map((requerido) => {
      const claveReq = normalizar(requerido.clave_curso);
      const nombreReq = normalizar(requerido.nombre_curso);

      // Todas las coincidencias en el historial (puede haberlo tomado varias veces)
      const coincidencias = this.cursosDelTrabajador.filter((h) => {
        const claveHist = normalizar(h.clave_curso);
        const nombreHist = normalizar(h.nombre_curso);
        return (claveReq && claveHist === claveReq) || (nombreReq && nombreHist === nombreReq);
      });

      if (coincidencias.length === 0) {
        return { ...requerido, estado: 'PENDIENTE', registro: null };
      }

      // Regla de duplicados: se conserva el registro con fecha_inicio MÁS RECIENTE
      const masReciente = coincidencias.reduce((masNuevo, actual) =>
        new Date(actual.fecha_inicio).getTime() > new Date(masNuevo.fecha_inicio).getTime()
          ? actual
          : masNuevo
      );

      return { ...requerido, estado: 'APROBADO', registro: masReciente };
    });

    this.resumenBateria = {
      total: this.comparacionBateria.length,
      aprobados: this.comparacionBateria.filter((c) => c.estado === 'APROBADO').length,
      pendientes: this.comparacionBateria.filter((c) => c.estado === 'PENDIENTE').length,
    };
  }

  limpiarFiltroBateria() {
    this.claveBateriaSeleccionada = '';
    this.cursosBateriaSeleccionada = [];
    this.comparacionBateria = [];
    this.resumenBateria = { total: 0, aprobados: 0, pendientes: 0 };
  }

  toggleTodos() {
    this.historialFiltrado.forEach((c) => (c.seleccionado = this.todosSeleccionados));
    this.cdRef.detectChanges();
  }

  get cursosSeleccionados(): any[] {
    return this.cursosDelTrabajador.filter((c) => c.seleccionado);
  }

  // 🚀 NUEVO: soporte de selección múltiple dentro del filtro de batería.
  // c.registro apunta al MISMO objeto que vive en cursosDelTrabajador (no es
  // una copia), así que marcar/desmarcar aquí también actualiza automáticamente
  // cursosSeleccionados y el botón "Generar Seleccionados" que ya tenías.
  get todosSeleccionadosBateria(): boolean {
    const aprobados = this.comparacionBateria.filter((c) => c.registro);
    return aprobados.length > 0 && aprobados.every((c) => c.registro.seleccionado);
  }

  toggleSeleccionTodosBateria(event: Event) {
    const marcar = (event.target as HTMLInputElement).checked;
    this.comparacionBateria.forEach((c) => {
      if (c.registro) c.registro.seleccionado = marcar;
    });
  }

  generarDC3Automatico() {
    const todosLosCursos = this.cursosDelTrabajador; 
    if (todosLosCursos.length === 0) {
      this.noti.mostrarError('Sin cursos', 'Este trabajador no tiene cursos registrados.');
      return;
    }
    this.generarLoteEnUnSoloPDF(todosLosCursos);
  }

  generarDC3Seleccionados() {
    const seleccionados = this.cursosSeleccionados;
    if (seleccionados.length === 0) {
      this.noti.mostrarError('Sin selección', 'Selecciona al menos un curso de la lista.');
      return;
    }
    this.generarLoteEnUnSoloPDF(seleccionados);
  }

  private async generarLoteEnUnSoloPDF(cursos: any[]) {
    const trabajador = this.trabajadorSeleccionado;
    this.abrirVistaPrevia();
    this.nombreArchivoPdf = `DC3_${trabajador.RPE}_${cursos.length}Cursos.pdf`;

    try {
      const blobs: Blob[] = [];
      for (let i = 0; i < cursos.length; i++) {
        const curso = cursos[i];
        const payload = {
          rpe_trabajador: trabajador.RPE,
          puesto: trabajador.PUESTO || '',
          ocupacion_especifica: trabajador.OCUPACION_ESPECIFICA || '',
          actividad_rel: curso.actividad_rel || curso.ACTIVIDAD,
          // 🚀 CAMBIO: Mandamos el ID exacto y la Fecha de Término para que el PDF las imprima obligatoriamente
          id_registro: curso.id_registro, 
          fecha_inicio: curso.fecha_inicio,
          fecha_termino: curso.fecha_termino, 
          area_tematica: curso.clave_area_stps || '',
          firmas: this.firmas,
        };

        const blobPDF = await new Promise<Blob>((resolve, reject) => {
          this.cursosService.generarPdfIndividual(payload).subscribe({
            next: (b: Blob) => resolve(b),
            error: (e) => reject(e),
          });
        });
        blobs.push(blobPDF);
      }

      let blobFinal: Blob;
      if (blobs.length === 1) {
        blobFinal = blobs[0];
        this.nombreArchivoPdf = `DC3_${trabajador.RPE}_${cursos[0].actividad_rel || 'CURSO'}.pdf`;
      } else {
        const form = new FormData();
        blobs.forEach((b, i) => form.append('pdfs', b, `doc_${i}.pdf`));

        const res = await fetch('http://localhost:3000/app/constancias/merge-pdfs', {
          method: 'POST',
          body: form,
        });

        if (!res.ok) throw new Error('Error en el servidor al fusionar los PDFs');
        blobFinal = await res.blob();
      }

      this.pdfBlob = blobFinal;
      this.urlTemporal = window.URL.createObjectURL(blobFinal);
      this.pdfUrlSegura = this.sanitizer.bypassSecurityTrustResourceUrl(this.urlTemporal);
      this.cargandoPdf = false;
      this.cdRef.detectChanges();
    } catch (error) {
      console.error('Error al generar el documento:', error);
      this.cerrarVistaPrevia();
      this.noti.mostrarError('Error', 'Hubo un problema al intentar generar o fusionar las constancias.');
    }
  }

  abrirVistaPrevia() {
    this.cargandoPdf = true;
    this.pdfUrlSegura = null;
    this.pdfBlob = null;
    this.cdRef.detectChanges();
    const modalEl = document.getElementById('modalVistaPreviaTrabajador');
    if (modalEl) Modal.getOrCreateInstance(modalEl, { backdrop: 'static' }).show();
  }

  cerrarVistaPrevia() {
    if (this.urlTemporal) {
      window.URL.revokeObjectURL(this.urlTemporal);
      this.urlTemporal = '';
    }
    this.pdfUrlSegura = null;
    this.pdfBlob = null;
    this.cdRef.detectChanges();
    const modalEl = document.getElementById('modalVistaPreviaTrabajador');
    if (modalEl) Modal.getInstance(modalEl)?.hide();
  }

  descargarPdf() {
    if (!this.pdfBlob) return;
    const a = document.createElement('a');
    a.href = this.urlTemporal;
    a.download = this.nombreArchivoPdf;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.noti.toastExito('Constancia descargada correctamente');
    this.cerrarVistaPrevia();
  }

  generarKardex(trabajador: any) {
    this.trabajadoresService.getCursosPorTrabajador(trabajador.RPE).subscribe({
      next: (res: any) => {
        const cursos = Array.isArray(res) ? res : res.data || [];
        if (cursos.length === 0) {
          this.noti.mostrarError('Sin cursos', 'Este trabajador no tiene cursos registrados aún.');
          return;
        }

        const datosKardex = {
          rpe_trabajador: trabajador.RPE,
          nombre_trabajador: trabajador.NOMBRE_COMPLETO,
          curp: trabajador.CURP,
          puesto: trabajador.PUESTO || 'Sin asignar',
          ocupacion: trabajador.OCUPACION_ESPECIFICA || 'Sin asignar',
          cursos: cursos.map((c: any) => ({
            nombre_curso: c.nombre_curso || c.NOMBRE_DEL_CURSO || 'Curso no identificado',
            fecha_inicio: c.fecha_inicio,
            fecha_termino: c.fecha_termino,
            calificacion: c.calificacion || 0,
            // 🚀 CAMBIO: Aplicamos la misma jerarquía para el Kardex
            horas: c.horas_acreditadas || c.DURACION_REAL_HRS || c.horas || 0,
            estado: c.estado_cchl || 'SIN ESTADO',
            acreditado: c.estado_cchl === 'APROBADO' ? 'SI' : 'NO',
          })),
        };

        this.generarKardexPDF(datosKardex);
      },
      error: (err) => {
        console.error('Error al obtener cursos:', err);
        this.noti.mostrarError('Error', 'No se pudo obtener los cursos del trabajador');
      },
    });
  }

  private generarKardexPDF(datos: any) {
    const apiUrl = 'http://localhost:3000/app/trabajadores/kardex/generar';
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Error al generar kardex');
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Kardex_${datos.rpe_trabajador}_${new Date().getTime()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.noti.toastExito('Kardex generado correctamente');
      })
      .catch((error) => {
        console.error('Error:', error);
        this.noti.mostrarError('Error', 'No se pudo generar el kardex');
      });
  }
}