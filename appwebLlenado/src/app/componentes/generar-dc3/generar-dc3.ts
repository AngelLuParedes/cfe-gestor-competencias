import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Modal } from 'bootstrap';

import { TrabajadoresService } from '../../servicios/trabajadores';
import { CursosService }       from '../../servicios/curso';
import { CatalogosService }    from '../../servicios/catalogo';
import { NotificacionesService } from '../../servicios/notificaciones';

// Catálogos de firmas — el usuario puede elegir de la lista O escribir manualmente
const CATALOGO_INSTRUCTORES   = ['SAMUEL DOMINGUEZ BECERRIL', 'JOSE MARTINEZ LOPEZ', 'PEDRO RAMIREZ GARCIA'];
const CATALOGO_PATRONES       = ['ARTURO LLEDIAS SAAVEDRA', 'ROBERTO SANCHEZ MENDEZ', 'CARLOS HERRERA FLORES'];
const CATALOGO_REPRESENTANTES = ['CHRISTIAN ALEJANDRO MELENDEZ LONA', 'MIGUEL TORRES REYES', 'ANA GARCIA VARGAS'];

interface ItemCola {
  id:       number;
  etiqueta: string;
  blob:     Blob;
  url:      string;
}

@Component({
  selector: 'app-generador-dc3',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generar-dc3.html'
})
export class GeneradorDc3 implements OnInit {

  listaTrabajadores: any[] = [];
  listaCursos:       any[] = [];
  listaAreas:        any[] = [];   // ← catálogo de áreas temáticas

  catInstructores   = CATALOGO_INSTRUCTORES;
  catPatrones       = CATALOGO_PATRONES;
  catRepresentantes = CATALOGO_REPRESENTANTES;

  datos = {
    trabajador: { rpe: '', nombre: '', curp: '', puesto: '', ocupacion: '' },
    curso: { actividad: '', nombre: '', duracion: '', area: '', fecha_inicio: '', fecha_termino: '' },
    firmas: {
      instructor:    CATALOGO_INSTRUCTORES[0],
      patron:        CATALOGO_PATRONES[0],
      representante: CATALOGO_REPRESENTANTES[0]
    }
  };

  // Cola de PDFs
  cola: ItemCola[]  = [];
  private idCounter = 0;
  modoUnido         = true;

  // Modal PDF
  pdfUrlSegura: SafeResourceUrl | null = null;
  cargandoPdf     = false;
  urlTemporal     = '';
  pdfBlob: Blob | null = null;
  descargandoLote = false;

  constructor(
    private trabajadoresService: TrabajadoresService,
    private cursosService:       CursosService,
    private catalogosService:    CatalogosService,
    private noti:                NotificacionesService,
    private sanitizer:           DomSanitizer,
    private cdr:                 ChangeDetectorRef
  ) {}

  ngOnInit() { this.cargarCatalogos(); }

  cargarCatalogos() {
    this.trabajadoresService.getTrabajadores().subscribe(res => {
      this.listaTrabajadores = Array.isArray(res) ? res : (res.data || []);
    });
    this.cursosService.getCursos().subscribe(res => {
      this.listaCursos = Array.isArray(res) ? res : (res.data || []);
    });
    // ← Carga el catálogo de áreas temáticas del backend
    this.catalogosService.getAreasTematicas().subscribe(res => {
      this.listaAreas = Array.isArray(res) ? res : (res.data || []);
    });
  }

  onTrabajadorChange() {
    if (!this.datos.trabajador.nombre) return;
    const txt = this.datos.trabajador.nombre.trim().toUpperCase();
    const sel = this.listaTrabajadores.find(t =>
      t.NOMBRE_COMPLETO?.toUpperCase().trim() === txt ||
      t.RPE?.toUpperCase().trim() === txt
    );
    if (sel) {
      this.datos.trabajador.rpe       = sel.RPE                  || '';
      this.datos.trabajador.curp      = sel.CURP                 || '';
      this.datos.trabajador.puesto    = sel.PUESTO               || '';
      this.datos.trabajador.ocupacion = sel.OCUPACION_ESPECIFICA || '';
    } else {
      this.datos.trabajador.rpe = this.datos.trabajador.curp =
      this.datos.trabajador.puesto = this.datos.trabajador.ocupacion = '';
    }
  }

  onCursoChange() {
    const sel = this.listaCursos.find(c =>
      c.NOMBRE_DEL_CURSO === this.datos.curso.nombre ||
      c.ACTIVIDAD        === this.datos.curso.nombre
    );
    if (sel) {
      this.datos.curso.actividad = sel.ACTIVIDAD         || '';
      this.datos.curso.duracion  = sel.DURACION_REAL_HRS || '';
      this.datos.curso.area      = sel.clave_area_stps   || '';
    }
  }

  // Cuando el usuario escribe o elige en el campo de área
  onAreaChange() {
    // Si lo que escribió coincide con una clave del catálogo, muestra "CLAVE - NOMBRE"
    const txt = this.datos.curso.area.trim().toUpperCase();
    const sel = this.listaAreas.find((a: any) =>
      a.clave?.toUpperCase() === txt ||
      a.nombre_area?.toUpperCase() === txt
    );
    if (sel) {
      this.datos.curso.area = `${sel.clave} - ${sel.nombre_area}`;
    }
  }

  // ── Validación ───────────────────────────────────────────────────────────────
  private validar(): boolean {
    if (!this.datos.trabajador.nombre || !this.datos.curso.nombre) {
      this.noti.mostrarError('Campos incompletos', 'Escribe al menos el nombre del trabajador y del curso.');
      return false;
    }
    return true;
  }

  private buildPayload() {
    return {
      trabajador: this.datos.trabajador,
      curso:      this.datos.curso,
      firmas:     this.datos.firmas
    };
  }

  // ── Modal helpers ────────────────────────────────────────────────────────────
  private abrirModal(id: string) {
    const el = document.getElementById(id);
    if (el) Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false }).show();
  }
  private cerrarModal(id: string) {
    const el = document.getElementById(id);
    if (el) Modal.getInstance(el)?.hide();
  }

  // ── Previsualizar ────────────────────────────────────────────────────────────
  previsualizarPDF() {
    if (!this.validar()) return;
    this.cargandoPdf = true; this.pdfUrlSegura = null; this.pdfBlob = null;
    this.abrirModal('modalVistaPreviaManual');

    this.cursosService.generarPdfManual(this.buildPayload()).subscribe({
      next: (blob: Blob) => {
        if (blob.type !== 'application/pdf') {
          this.noti.mostrarError('Error', 'El servidor no devolvió un PDF válido.');
          this.cargandoPdf = false; this.cdr.detectChanges(); return;
        }
        this.pdfBlob     = blob;
        this.urlTemporal = window.URL.createObjectURL(blob);
        this.pdfUrlSegura = this.sanitizer.bypassSecurityTrustResourceUrl(this.urlTemporal);
        this.cargandoPdf  = false; this.cdr.detectChanges();
      },
      error: () => {
        this.noti.mostrarError('Error', 'Fallo al generar el PDF.');
        this.cargandoPdf = false; this.cerrarVistaPrevia(); this.cdr.detectChanges();
      }
    });
  }

  // ── Cola ─────────────────────────────────────────────────────────────────────
  agregarACola() {
    if (!this.validar()) return;
    this.cursosService.generarPdfManual(this.buildPayload()).subscribe({
      next: (blob: Blob) => {
        if (blob.type !== 'application/pdf') {
          this.noti.mostrarError('Error', 'El servidor no devolvió un PDF válido.'); return;
        }
        const url      = window.URL.createObjectURL(blob);
        const etiqueta = `${this.datos.trabajador.nombre.toUpperCase()} — ${this.datos.curso.nombre.toUpperCase()}`;
        this.cola.push({ id: ++this.idCounter, etiqueta, blob, url });
        this.noti.toastExito(`Agregado a la cola (${this.cola.length} total)`);
        this.cdr.detectChanges();
      },
      error: () => this.noti.mostrarError('Error', 'No se pudo generar el PDF para la cola.')
    });
  }

  descargarDeCola(item: ItemCola) {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `DC3_${item.etiqueta.replace(/[^A-Z0-9]/g, '_')}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  previsualizarItemCola(item: ItemCola) {
    this.pdfBlob = item.blob;
    this.urlTemporal = item.url;
    this.pdfUrlSegura = this.sanitizer.bypassSecurityTrustResourceUrl(item.url);
    this.cargandoPdf  = false;
    this.abrirModal('modalVistaPreviaManual');
    this.cdr.detectChanges();
  }

  quitarDeCola(item: ItemCola) {
    window.URL.revokeObjectURL(item.url);
    this.cola = this.cola.filter(i => i.id !== item.id);
    this.cdr.detectChanges();
  }

  vaciarCola() {
    this.cola.forEach(i => window.URL.revokeObjectURL(i.url));
    this.cola = []; this.cdr.detectChanges();
  }

  async descargarCola() {
    if (!this.cola.length) return;
    if (this.modoUnido) {
      this.descargandoLote = true; this.cdr.detectChanges();
      await this._descargarUnidos();
    } else {
      for (let i = 0; i < this.cola.length; i++) {
        setTimeout(() => this.descargarDeCola(this.cola[i]), i * 300);
      }
      this.noti.toastExito(`Descargando ${this.cola.length} archivos individualmente`);
    }
  }

  private async _descargarUnidos() {
    try {
      const form = new FormData();
      this.cola.forEach((item, i) => form.append('pdfs', item.blob, `doc_${i}.pdf`));
      const res = await fetch('http://localhost:3000/app/constancias/merge-pdfs', { method: 'POST', body: form });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `DC3_LOTE_${this.cola.length}_constancias.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.noti.toastExito(`${this.cola.length} constancias en un solo PDF`);
    } catch {
      this.noti.mostrarError('Error', 'No se pudieron fusionar los PDFs. Intenta con descarga individual.');
    } finally {
      this.descargandoLote = false; this.cdr.detectChanges();
    }
  }

  descargarPdf() {
    if (!this.pdfBlob) return;
    const a = document.createElement('a');
    a.href = this.urlTemporal;
    a.download = `DC3_${this.datos.trabajador.rpe || 'MANUAL'}_${this.datos.curso.actividad || 'CURSO'}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    this.noti.toastExito('Constancia descargada');
  }

  cerrarVistaPrevia() {
    if (this.urlTemporal) { window.URL.revokeObjectURL(this.urlTemporal); this.urlTemporal = ''; }
    this.pdfUrlSegura = null; this.pdfBlob = null;
    this.cerrarModal('modalVistaPreviaManual');
  }

  get tieneCola(): boolean { return this.cola.length > 0; }
}