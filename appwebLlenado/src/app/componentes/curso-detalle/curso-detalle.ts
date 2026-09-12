import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Modal } from 'bootstrap';
import { CursosService } from '../../servicios/curso';
import { NotificacionesService } from '../../servicios/notificaciones';

const CATALOGO_INSTRUCTORES = [
  'SAMUEL DOMINGUEZ BECERRIL',
  'JOSE MARTINEZ LOPEZ',
  'PEDRO RAMIREZ GARCIA',
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
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './curso-detalle.html'
})
export class CursoDetalle implements OnInit {
  trabajadoresTodos: any[] = [];
  trabajadoresFiltrados: any[] = [];
  curso: any = null;

  estatusDisponibles: string[] = [];
  estatusSeleccionado: string = 'TODOS';
  aniosDisponibles: number[] = [];
  anioSeleccionado: string | number = 'TODOS';

  // PDF
  pdfUrlSegura: SafeResourceUrl | null = null;
  cargandoPdf: boolean = false;
  urlTemporal: string = '';
  pdfBlob: Blob | null = null;
  trabajadorPdf: any = null;
  modoLote: boolean = false;
  trabajadoresLotePdf: any[] = [];
  registroAEditar: any = {};

  catalogoInstructores   = CATALOGO_INSTRUCTORES;
  catalogoPatrones       = CATALOGO_PATRONES;
  catalogoRepresentantes = CATALOGO_REPRESENTANTES;

  firmas = {
    instructor:    CATALOGO_INSTRUCTORES[0],
    patron:        CATALOGO_PATRONES[0],
    representante: CATALOGO_REPRESENTANTES[0],
  };

  constructor(
    private route: ActivatedRoute,
    private cursosService: CursosService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private noti: NotificacionesService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargarDatos(id);
  }

  cargarDatos(id: string) {
    this.cursosService.getCurso(id).subscribe({
      next: (res) => {
        this.curso = Array.isArray(res) ? res[0] : res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error curso:', err)
    });

    this.cursosService.getTrabajadoresPorCurso(id).subscribe({
      next: (res) => {
        let data = Array.isArray(res) ? res : (res.data || []);
        data.sort((a: any, b: any) => {
          const dateA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0;
          const dateB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0;
          return dateB - dateA;
        });
        this.trabajadoresTodos = data;
        this.trabajadoresFiltrados = [...this.trabajadoresTodos];
        this.actualizarFiltrosDisponibles();
      },
      error: (err) => console.error('Error trabajadores:', err)
    });
  }

  actualizarFiltrosDisponibles() {
    const estatus = this.trabajadoresTodos.map(t => t.estado_cchl).filter(e => e);
    this.estatusDisponibles = [...new Set(estatus)] as string[];
    const anios = this.trabajadoresTodos
      .filter(t => t.fecha_inicio)
      .map(t => new Date(t.fecha_inicio).getFullYear());
    this.aniosDisponibles = [...new Set(anios)].sort((a, b) => b - a);
    this.cdr.detectChanges();
  }

  aplicarFiltros() {
    let filtrados = [...this.trabajadoresTodos];
    if (this.anioSeleccionado !== 'TODOS') {
      filtrados = filtrados.filter(t =>
        new Date(t.fecha_inicio).getFullYear() === Number(this.anioSeleccionado)
      );
    }
    if (this.estatusSeleccionado !== 'TODOS') {
      filtrados = filtrados.filter(t => t.estado_cchl === this.estatusSeleccionado);
    }
    this.trabajadoresFiltrados = filtrados;
    this.cdr.detectChanges();
  }

  async eliminarRegistro(t: any) {
    const confirmado = await this.noti.confirmarAccion(
      '¿Eliminar registro?',
      `¿Estás seguro de que deseas eliminar el historial de ${t.NOMBRE_COMPLETO} en este curso?`
    );
    if (confirmado) {
      this.trabajadoresTodos = this.trabajadoresTodos.filter(item => item !== t);
      this.aplicarFiltros();
      this.noti.toastExito('Registro eliminado correctamente');
    }
  }

  editarRegistro(t: any) {
    // Hacemos una copia para no alterar la tabla hasta que el usuario guarde
    this.registroAEditar = { ...t };
    
    // Convertimos las fechas de la base de datos al formato 'YYYY-MM-DD' que entienden los inputs HTML
    if (this.registroAEditar.fecha_inicio) {
      this.registroAEditar.fecha_inicio = new Date(this.registroAEditar.fecha_inicio).toISOString().substring(0, 10);
    }
    if (this.registroAEditar.fecha_termino) {
      this.registroAEditar.fecha_termino = new Date(this.registroAEditar.fecha_termino).toISOString().substring(0, 10);
    }
  }

  guardarEdicion() {
    if (!this.registroAEditar.id_registro) return;

    // Llamamos al backend para actualizar el historial
    this.cursosService.updateHistorialRegistro(this.registroAEditar.id_registro, this.registroAEditar).subscribe({
      next: () => {
        this.noti.toastExito('Registro actualizado correctamente');
        
        // Cerramos la ventana de Bootstrap
        const modalEl = document.getElementById('modalEditar');
        if (modalEl) Modal.getInstance(modalEl)?.hide();

        // Actualizamos los datos localmente para que la tabla reaccione de inmediato
        const index = this.trabajadoresTodos.findIndex(item => item.id_registro === this.registroAEditar.id_registro);
        if (index !== -1) {
           this.trabajadoresTodos[index].fecha_inicio = this.registroAEditar.fecha_inicio;
           this.trabajadoresTodos[index].fecha_termino = this.registroAEditar.fecha_termino;
           this.trabajadoresTodos[index].horas_acreditadas = this.registroAEditar.horas_acreditadas;
           this.trabajadoresTodos[index].calificacion = this.registroAEditar.calificacion;
        }
        
        // Refrescamos los filtros para que se actualice la vista
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error("Error al editar historial:", err);
        this.noti.mostrarError('Error', 'No se pudo guardar la información');
      }
    });
  }

  async resetearEstado(t: any) {
    const confirmado = await this.noti.confirmarAccion(
      '¿Resetear estado?',
      `Se marcará la constancia de ${t.NOMBRE_COMPLETO} como "NO GENERADA" y podrá volver a generarse.`
    );
    if (!confirmado) return;

    if (!t.id_registro) {
      this.noti.mostrarError('Error', 'Este registro no tiene id_registro.');
      return;
    }

    this.cursosService.resetearEstadoRegistro(t.id_registro).subscribe({
      next: () => {
        const index = this.trabajadoresTodos.findIndex(item => item.id_registro === t.id_registro);
        if (index !== -1) this.trabajadoresTodos[index].estado_cchl = 'NO GENERADA';
        this.actualizarFiltrosDisponibles();
        this.aplicarFiltros();
        this.noti.toastExito('Estado reseteado a NO GENERADA');
      },
      error: async (err) => {
        const msg = err.error instanceof Blob
          ? await this.leerErrorBlob(err.error)
          : (err.error?.message || 'No se pudo resetear el estado');
        this.noti.mostrarError('Error', msg);
      }
    });
  }

  // ── PDF ─────────────────────────────────────────────────────────────────────

  private abrirModal() {
    const modalEl = document.getElementById('modalVistaPrevia');
    if (modalEl) Modal.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: false }).show();
  }

  private leerErrorBlob(blobError: Blob): Promise<string> {
    return blobError.text().then(text => {
      try { return JSON.parse(text).message || 'Error desconocido'; }
      catch { return 'Error al comunicarse con el servidor'; }
    });
  }

  verDocumento(t: any) {
    this.prepararModalPDF(false);
    this.trabajadorPdf = t;
    this.abrirModal();

    const payload = {
      rpe_trabajador:      t.RPE,
      actividad_rel:       this.curso.ACTIVIDAD,
      id_registro:         t.id_registro,
      fecha_inicio:        t.fecha_inicio,
      puesto:              t.PUESTO              ?? null,
      ocupacion_especifica: t.OCUPACION_ESPECIFICA ?? null,
      area_tematica:       this.curso.clave_area_stps || '',
      horas_acreditadas:   t.horas_acreditadas, /* 🚀 NUEVO: Se envían al generador de PDF */
      firmas:              this.firmas
    };

    this.cursosService.generarPdfIndividual(payload).subscribe({
      next: async (blob: Blob) => {
        if (blob.type !== 'application/pdf') {
          const msg = await this.leerErrorBlob(blob);
          this.noti.mostrarError('Error del servidor', msg);
          this.cargandoPdf = false;
          this.cdr.detectChanges();
          return;
        }
        this.pdfBlob    = blob;
        this.urlTemporal = window.URL.createObjectURL(blob);
        this.pdfUrlSegura = this.sanitizer.bypassSecurityTrustResourceUrl(this.urlTemporal);
        this.cargandoPdf  = false;
        this.cdr.detectChanges();
      },
      error: async (err) => {
        const msg = err.error instanceof Blob
          ? await this.leerErrorBlob(err.error)
          : 'No se pudo conectar con el servidor';
        this.noti.mostrarError('Error', msg);
        this.cargandoPdf = false;
        this.cdr.detectChanges();
      }
    });
  }

  verDocumentosLote() {
    // 🚀 CAMBIO: Ahora sí tomará a los que dicen "APROBADO"
    const pendientes = this.trabajadoresFiltrados.filter(t =>
      t.estado_cchl !== 'CERRADA CON ARCHIVO' 
    );

    if (pendientes.length === 0) {
      this.noti.mostrarError('Aviso', 'Todos los trabajadores listados ya tienen su constancia generada.');
      return;
    }

    this.prepararModalPDF(true);
    this.trabajadoresLotePdf = pendientes;
    this.abrirModal();

    const payload = {
      // FIX: enviar array completo de objetos con puesto y ocupación
      // para que el backend pueda usar los datos sin hacer JOIN adicional
      trabajadores: pendientes.map(t => ({
        rpe:                 t.RPE,
        nombre_completo:     t.NOMBRE_COMPLETO,
        curp:                t.CURP,
        puesto:              t.PUESTO              ?? null,
        ocupacion_especifica: t.OCUPACION_ESPECIFICA ?? null,
        id_registro:         t.id_registro,
        fecha_inicio:        t.fecha_inicio,
        fecha_termino:       t.fecha_termino,
        calificacion:        t.calificacion,
        estado_cchl:         t.estado_cchl,
        horas_acreditadas:   t.horas_acreditadas /* 🚀 NUEVO: Se envían al generador de PDF */
      })),
      // Mantenemos los campos originales por compatibilidad con el backend actual
      rpes_trabajadores: pendientes.map(t => t.RPE),
      actividad_rel:     this.curso.ACTIVIDAD,
      firmas:            this.firmas
    };

    this.cursosService.generarPdfLote(payload).subscribe({
      next: async (blob: Blob) => {
        if (blob.type !== 'application/pdf') {
          const msg = await this.leerErrorBlob(blob);
          this.noti.mostrarError('Error del servidor', msg);
          this.cargandoPdf = false;
          this.cdr.detectChanges();
          return;
        }
        this.pdfBlob    = blob;
        this.urlTemporal = window.URL.createObjectURL(blob);
        this.pdfUrlSegura = this.sanitizer.bypassSecurityTrustResourceUrl(this.urlTemporal);
        this.cargandoPdf  = false;
        this.cdr.detectChanges();
      },
      error: async (err) => {
        const msg = err.error instanceof Blob
          ? await this.leerErrorBlob(err.error)
          : 'No se pudo conectar con el servidor';
        this.noti.mostrarError('Error', msg);
        this.cargandoPdf = false;
        this.cdr.detectChanges();
      }
    });
  }

  prepararModalPDF(esLote: boolean) {
    this.cargandoPdf  = true;
    this.pdfUrlSegura = null;
    this.pdfBlob      = null;
    this.modoLote     = esLote;
    this.cdr.detectChanges();
  }

  descargarPdf() {
    if (!this.pdfBlob) return;

    const nombreArchivo = this.modoLote
      ? `DC3_LOTE_${this.curso.ACTIVIDAD}.pdf`
      : `DC3_${this.trabajadorPdf.RPE}_${this.curso.ACTIVIDAD}.pdf`;

    const trabajadoresAActualizar = this.modoLote
      ? this.trabajadoresLotePdf
      : [this.trabajadorPdf];

    const a = document.createElement('a');
    a.href = this.urlTemporal;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    trabajadoresAActualizar.forEach(t => {
      const index = this.trabajadoresTodos.findIndex(item => item.id_registro === t.id_registro);
      if (index !== -1) this.trabajadoresTodos[index].estado_cchl = 'CERRADA CON ARCHIVO';
    });

    this.actualizarFiltrosDisponibles();
    this.aplicarFiltros();
    this.noti.toastExito(this.modoLote
      ? 'Lote descargado y estatus actualizados'
      : 'Archivo descargado y estatus actualizado'
    );
  }

  cerrarVistaPrevia() {
    if (this.urlTemporal) {
      window.URL.revokeObjectURL(this.urlTemporal);
      this.urlTemporal = '';
    }
    this.pdfUrlSegura = null;
    this.pdfBlob      = null;
    this.trabajadorPdf = null;
    this.trabajadoresLotePdf = [];
  }
}