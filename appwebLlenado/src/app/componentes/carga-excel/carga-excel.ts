import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExcelService, ResultadoCarga, ResultadoCompleto } from '../../servicios/excel';
import { NotificacionesService } from '../../servicios/notificaciones';

// 1. AQUÍ AGREGAMOS 'kardex' AL TIPO DE TABLAS
type TablaKey = 'completo' | 'cursos' | 'trabajadores' | 'historial' | 'kardex';

@Component({
  selector: 'app-carga-excel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carga-excel.html',
  styleUrls: ['./carga-excel.css']
})
export class CargaExcelComponent {

  tablaSeleccionada: TablaKey | '' = '';
  archivoSeleccionado: File | null = null;
  isDragging     = false;
  cargando       = false;
  errorMensaje   = '';
  resultadoCarga:    ResultadoCarga    | null = null;
  resultadoCompleto: ResultadoCompleto | null = null;

  // 2. AQUÍ AGREGAMOS LA INFORMACIÓN VISUAL DEL KARDEX
  columnasEsperadas: Record<TablaKey, string[]> = {
    completo: [
      'ACTIVIDAD', 'NOMBRE DEL CURSO', 'RPE', 'CURP',
      'NOMBRE COMPLETO', 'FECHA DE INICIO', 'FECHA DE TÉRMINO',
      'CALIFICACIÓN', 'ESTADO CCHL'
    ],
    cursos: [
      'SUBPROCESO', 'CLAVE_DEL_AREA', 'AREA', 'AÑO',
      'ACTIVIDAD', 'CLAVE_ACTIVIDAD', 'CLAVE_CURSO',
      'NOMBRE_DEL_CURSO', 'DURACION_REAL_HRS'
    ],
    trabajadores: ['RPE', 'CURP', 'NOMBRE_COMPLETO', 'PUESTO', 'OCUPACION_ESPECIFICA'],
    historial: [
      'rpe_trabajador', 'actividad_rel', 'fecha_inicio',
      'fecha_termino', 'calificacion', 'estado_cchl'
    ],
    kardex: [
      'RPE (Se lee de la celda C8)',
      'CURSOS (Se lee Columna C desde fila 12)',
      'HORAS (Se lee Columna D desde fila 12)',
      'FECHAS (Se lee Columna H desde fila 12)'
    ]
  };

  private readonly EXTENSIONES_VALIDAS = ['.xlsx', '.xls', '.csv'];
  private readonly TIPOS_MIME_VALIDOS = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];

  constructor(
    private excelService: ExcelService,
    private noti: NotificacionesService,
    private cdr: ChangeDetectorRef   // ← fuerza la detección de cambios
  ) {}

  get esModoCompleto(): boolean { return this.tablaSeleccionada === 'completo'; }

  // ── Manejo de archivo ───────────────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.procesarArchivo(input.files[0]);
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault(); e.stopPropagation();
    if (this.tablaSeleccionada) this.isDragging = true;
  }

  onDragLeave(e: DragEvent): void { e.preventDefault(); this.isDragging = false; }

  onDrop(e: DragEvent): void {
    e.preventDefault(); e.stopPropagation();
    this.isDragging = false;
    if (!this.tablaSeleccionada) return;
    const f = e.dataTransfer?.files?.[0];
    if (f) this.procesarArchivo(f);
  }

  private procesarArchivo(archivo: File): void {
    this.limpiarEstado();
    const ext = archivo.name.substring(archivo.name.lastIndexOf('.')).toLowerCase();
    if (!this.EXTENSIONES_VALIDAS.includes(ext) && !this.TIPOS_MIME_VALIDOS.includes(archivo.type)) {
      this.errorMensaje = `Formato no válido. Solo: ${this.EXTENSIONES_VALIDAS.join(', ')}`;
      this.noti.mostrarError('Archivo no válido', this.errorMensaje);
      return;
    }
    if (archivo.size > 10 * 1024 * 1024) {
      this.errorMensaje = 'El archivo no puede superar los 10 MB.';
      return;
    }
    this.archivoSeleccionado = archivo;
    this.noti.toastExito(`Archivo "${archivo.name}" listo para subir`);
  }

  // ── Subir ───────────────────────────────────────────────────────────────────
  subirArchivo(): void {
    if (!this.archivoSeleccionado || !this.tablaSeleccionada) return;

    this.cargando = true;
    this.limpiarEstado();

    const finalizar = () => {
      this.cargando = false;
      this.cdr.detectChanges();   // ← fuerza que Angular actualice la vista
    };

    if (this.esModoCompleto) {
      this.excelService.subirExcelCompleto(this.archivoSeleccionado).subscribe({
        next: (r) => {
          this.resultadoCompleto = r;
          finalizar();
          this.noti.toastExito(
            `Completado: ${r.totalInsertados} nuevos, ${r.totalActualizados} actualizados`
          );
        },
        error: (err) => {
          this.errorMensaje = err.message || 'Error al procesar el archivo.';
          finalizar();
          this.noti.mostrarError('Error de Carga', this.errorMensaje);
        }
      });
    } else {
      // Como "kardex" es una carga individual, entrará automáticamente por aquí
      this.excelService.subirExcel(this.archivoSeleccionado, this.tablaSeleccionada).subscribe({
        next: (r) => {
          this.resultadoCarga = r;
          finalizar();
          this.noti.toastExito(`¡Éxito! ${r.insertados} registros procesados.`);
        },
        error: (err) => {
          this.errorMensaje = err.message || 'Error al procesar el archivo.';
          finalizar();
          this.noti.mostrarError('Error de Carga', this.errorMensaje);
        }
      });
    }
  }

  // ── Utilidades ──────────────────────────────────────────────────────────────
  removeFile(e: MouseEvent): void {
    e.stopPropagation();
    this.archivoSeleccionado = null;
    this.limpiarEstado();
  }

  limpiarFormulario(): void {
    this.tablaSeleccionada = '';
    this.archivoSeleccionado = null;
    this.limpiarEstado();
  }

  private limpiarEstado(): void {
    this.errorMensaje      = '';
    this.resultadoCarga    = null;
    this.resultadoCompleto = null;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}