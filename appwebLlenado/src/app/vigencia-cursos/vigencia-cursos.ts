import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VigenciaService } from '../servicios/vigencia';
import { NotificacionesService } from '../servicios/notificaciones';
import * as XLSX from 'xlsx';

interface CursoVigencia {
  id_registro: number;
  nombre_curso: string;
  clave_curso: string;
  fecha_inicio: string;
  fecha_termino: string;
  calificacion: number;
  estado_cchl: string;
  vigencia_aplicada: number;
  fecha_vencimiento: string;
  estado_vigencia: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'REPROBADO';
  dias_restantes: number;
}

interface TrabajadorVigencia {
  RPE: string;
  NOMBRE_COMPLETO: string;
  PUESTO: string;
  OCUPACION_ESPECIFICA: string;
  cursos: CursoVigencia[];
}

@Component({
  selector: 'app-vigencia-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vigencia-cursos.html',
  styleUrls: ['./vigencia-cursos.css'],
})
export class VigenciaCursosComponent implements OnInit {
  trabajadores: TrabajadorVigencia[] = [];
  trabajadoresFiltrados: TrabajadorVigencia[] = [];
  
  cargando: boolean = false;
  mesFiltro: number | null = null;
  anioFiltro: number | null = null;
  terminoBusqueda: string = '';

  estadoSeleccionado: string | null = null;
  grupoCursos: 'todos' | 'criticos' = 'todos';

  paginaActual: number = 1;
  itemsPorPagina: number = 20;

  totales = {
    trabajadores: 0,
    porVencer: 0,
    vencidos: 0,
    reprobados: 0
  };

  Math = Math;

  meses = [
    { numero: 1, nombre: 'Enero' }, { numero: 2, nombre: 'Febrero' }, { numero: 3, nombre: 'Marzo' },
    { numero: 4, nombre: 'Abril' }, { numero: 5, nombre: 'Mayo' }, { numero: 6, nombre: 'Junio' },
    { numero: 7, nombre: 'Julio' }, { numero: 8, nombre: 'Agosto' }, { numero: 9, nombre: 'Septiembre' },
    { numero: 10, nombre: 'Octubre' }, { numero: 11, nombre: 'Noviembre' }, { numero: 12, nombre: 'Diciembre' },
  ];
  anios: number[] = [];

  readonly CURSOS_CRITICOS = [
    'MANEJO A LA DEFENSIVA',
    'GIL HERRAMIENTAS',
    'ANALISIS DE RIESGO', 
    'ARS-RIM',
    'TRABAJOS EN ALTURAS',
    'ACTIVIDADES QUE SALVAN VIDAS',
    'AISLADO SOBRE AISLADO'
  ];

  constructor(
    private vigenciaService: VigenciaService,
    private cdRef: ChangeDetectorRef,
    private noti: NotificacionesService,
  ) {}

  ngOnInit(): void {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual - 3; i <= anioActual + 5; i++) {
      this.anios.push(i);
    }
    this.cargarVigencia();
  }

  cargarVigencia() {
    this.cargando = true;
    this.vigenciaService.getVigenciaCompleta().subscribe({
      next: (res: any) => {
        this.trabajadores = Array.isArray(res) ? res : res.data || [];
        this.filtrar();
        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar vigencia:', err);
        this.noti.mostrarError('Error', 'No se pudo cargar los datos de vigencia');
        this.cargando = false;
        this.cdRef.detectChanges();
      },
    });
  }

  cargarPorMes(mes: number) {
    this.mesFiltro = mes;
    this.filtrar();
  }

  seleccionarAnio(anio: number | null) { 
    this.anioFiltro = anio;
    this.filtrar();
  }

  cambiarGrupoCursos(grupo: 'todos' | 'criticos') {
    this.grupoCursos = grupo;
    this.filtrar();
  }

  seleccionarEstado(estado: string | null) {
    this.estadoSeleccionado = this.estadoSeleccionado === estado ? null : estado;
    this.filtrar();
  }

  limpiarMes() {
    this.mesFiltro = null;
    this.filtrar();
  }

  limpiarFiltrosGenerales() {
    this.mesFiltro = null;
    this.anioFiltro = null;
    this.terminoBusqueda = '';
    this.estadoSeleccionado = null;
    this.grupoCursos = 'todos';
    this.filtrar();
  }

  filtrar() {
    let resultado = [...this.trabajadores];

    if (this.grupoCursos === 'criticos') {
      resultado = resultado.map(t => ({
        ...t,
        cursos: t.cursos.filter(c => 
          this.CURSOS_CRITICOS.some(critico => c.nombre_curso.toUpperCase().includes(critico.toUpperCase()))
        )
      })).filter(t => t.cursos.length > 0);
    }

    if (this.mesFiltro !== null) {
      resultado = resultado.map((t) => ({
        ...t,
        cursos: t.cursos.filter((c) => {
          if (!c.fecha_vencimiento || c.fecha_vencimiento === 'Error' || c.fecha_vencimiento === 'No caduca') return false;
          return parseInt(c.fecha_vencimiento.split('-')[1]) === this.mesFiltro;
        }),
      })).filter((t) => t.cursos.length > 0);
    }

    if (this.anioFiltro !== null) {
      resultado = resultado.map((t) => ({
        ...t,
        cursos: t.cursos.filter((c) => {
          if (!c.fecha_vencimiento || c.fecha_vencimiento === 'Error' || c.fecha_vencimiento === 'No caduca') return false;
          return c.fecha_vencimiento.startsWith(this.anioFiltro!.toString());
        }),
      })).filter((t) => t.cursos.length > 0);
    }

    if (this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (t) =>
          t.NOMBRE_COMPLETO?.toLowerCase().includes(termino) ||
          t.RPE?.toLowerCase().includes(termino),
      );
    }

    if (this.mesFiltro === null && this.anioFiltro === null && this.terminoBusqueda.trim() === '' && this.grupoCursos === 'todos' && this.estadoSeleccionado === null) {
      resultado = resultado.map((t) => ({
        ...t,
        cursos: t.cursos.filter((c) => c.estado_vigencia !== 'VIGENTE'),
      })).filter((t) => t.cursos.length > 0);
    }

    this.totales.trabajadores = resultado.length;
    this.totales.vencidos = resultado.reduce((sum, t) => sum + t.cursos.filter(c => c.estado_vigencia === 'VENCIDO').length, 0);
    this.totales.porVencer = resultado.reduce((sum, t) => sum + t.cursos.filter(c => c.estado_vigencia === 'POR_VENCER').length, 0);
    this.totales.reprobados = resultado.reduce((sum, t) => sum + t.cursos.filter(c => c.estado_vigencia === 'REPROBADO').length, 0);

    if (this.estadoSeleccionado) {
      resultado = resultado.map(t => ({
          ...t,
          cursos: t.cursos.filter(c => c.estado_vigencia === this.estadoSeleccionado)
      })).filter(t => t.cursos.length > 0);
    }

    this.trabajadoresFiltrados = resultado;
    this.paginaActual = 1; 
    this.cdRef.detectChanges();
  }

  get trabajadoresPaginados() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.trabajadoresFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get paginasTotales() {
    return Math.ceil(this.trabajadoresFiltrados.length / this.itemsPorPagina) || 1;
  }

  cambiarPagina(delta: number) {
    const nueva = this.paginaActual + delta;
    if (nueva >= 1 && nueva <= this.paginasTotales) {
      this.paginaActual = nueva;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  obtenerEstadoTexto(estado: string): string {
    switch (estado) {
      case 'VIGENTE': return '✓ Vigente';
      case 'POR_VENCER': return '⚠ Por vencer';
      case 'VENCIDO': return '✗ Vencido';
      case 'REPROBADO': return '❌ Reprobado';
      default: return 'Sin estado';
    }
  }

  contarPorEstado(trabajador: TrabajadorVigencia): { vigentes: number; porVencer: number; vencidos: number; reprobados: number } {
    return {
      vigentes: trabajador.cursos.filter((c) => c.estado_vigencia === 'VIGENTE').length,
      porVencer: trabajador.cursos.filter((c) => c.estado_vigencia === 'POR_VENCER').length,
      vencidos: trabajador.cursos.filter((c) => c.estado_vigencia === 'VENCIDO').length,
      reprobados: trabajador.cursos.filter((c) => c.estado_vigencia === 'REPROBADO').length,
    };
  }

  obtenerNombreMes(): string {
    if (!this.mesFiltro) return 'Filtrar por mes';
    const mes = this.meses.find(m => m.numero === this.mesFiltro);
    return mes ? mes.nombre : 'Mes';
  }

  descargarExcelAnalisis() {
    const datosPlanos: any[] = [];
    const trabajadoresAExportar = this.trabajadoresFiltrados;

    if (trabajadoresAExportar.length === 0) {
      this.noti.mostrarError('Sin datos', 'No hay registros en pantalla para exportar.');
      return;
    }

    this.noti.toastExito('Generando archivo Excel...');

    trabajadoresAExportar.forEach(t => {
      t.cursos.forEach(c => {
        let fechaTerminoFormat = c.fecha_termino ? new Date(c.fecha_termino).toLocaleDateString('es-MX') : '';
        let fechaVencimientoFormat = (c.fecha_vencimiento && c.fecha_vencimiento !== 'Error' && c.fecha_vencimiento !== 'No caduca') 
                                      ? new Date(c.fecha_vencimiento).toLocaleDateString('es-MX') 
                                      : c.fecha_vencimiento;

        datosPlanos.push({
          'RPE': t.RPE,
          'Nombre del Trabajador': t.NOMBRE_COMPLETO,
          'Puesto': t.PUESTO || 'Sin asignar',
          'Ocupación Específica': t.OCUPACION_ESPECIFICA || 'Sin asignar',
          'Clave del Curso': c.clave_curso,
          'Nombre del Curso': c.nombre_curso,
          'Calificación': c.calificacion !== null ? c.calificacion : 'N/A',
          'Fecha Término': fechaTerminoFormat,
          'Vigencia (Años)': c.vigencia_aplicada > 0 ? c.vigencia_aplicada : 'Sin vigencia',
          'Fecha Vencimiento': fechaVencimientoFormat,
          'Estado': c.estado_vigencia,
          'Días Restantes': c.dias_restantes !== null ? c.dias_restantes : 'N/A'
        });
      });
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosPlanos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Análisis de Vigencias');

    ws['!cols'] = [
      { wch: 10 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, 
      { wch: 15 }, { wch: 45 }, { wch: 12 }, { wch: 15 }, 
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];

    const fechaActual = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `Analisis_Vigencias_CFE_${fechaActual}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  }
}