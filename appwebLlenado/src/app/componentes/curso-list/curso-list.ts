import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CursosService } from '../../servicios/curso';
import { Curso } from '../../modelos/Curso';
import { Router } from '@angular/router';
import { CatalogosService } from '../../servicios/catalogo';
import { NotificacionesService } from '../../servicios/notificaciones';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-curso-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './curso-list.html',
})
export class CursoList implements OnInit {
  cursos: Curso[] = [];
  cursosFiltrados: Curso[] = [];
  terminoBusqueda: string = '';
  cargando: boolean = true;
  cursoAEditar: any = {};
  listaAreas: any[] = [];

  // NUEVAS VARIABLES PARA EL FILTRO DE AÑO
  aniosDisponibles: number[] = [];
  anioSeleccionado: string | number = 'TODOS';

  constructor(
    private cursosService: CursosService,
    private catalogosService: CatalogosService,       
    private noti: NotificacionesService,              
    private cdr: ChangeDetectorRef,
    private router: Router, 
  ) {}

  ngOnInit(): void {
    this.obtenerCursos();
    this.cargarAreas();
  }

  obtenerCursos(): void {
  this.cargando = true; 
  this.cursosService.getCursos().subscribe({
    next: (res) => {
      this.cursos = Array.isArray(res) ? res : res.data || [];
      
      // 🚀 CAMBIO: Iniciar vacío, no mostrar nada hasta que busque
      this.cursosFiltrados = []; 

      const anios = this.cursos
        .map(c => c.AÑO)
        .filter(a => a);
      
      this.aniosDisponibles = [...new Set(anios)].sort((a, b) => b - a);

      this.cargando = false; 
      this.cdr.detectChanges(); 
    },
    error: (err) => {
      console.error('Error al obtener cursos:', err);
      this.cargando = false;
      this.cdr.detectChanges();
    },
  });
}
  // CAMBIO: Ahora esta función aplica el filtro de Año y el de Texto simultáneamente
  buscar(): void {
    let filtrados = [...this.cursos];

    // 1. Filtrar por Año si no está en "TODOS"
    if (this.anioSeleccionado !== 'TODOS') {
      filtrados = filtrados.filter(c => c.AÑO === Number(this.anioSeleccionado));
    }

    // 2. Filtrar por Texto (Nombre o Actividad)
    const termino = this.terminoBusqueda.toLowerCase().trim();
    if (termino) {
      filtrados = filtrados.filter(c =>
        (c.NOMBRE_DEL_CURSO && c.NOMBRE_DEL_CURSO.toLowerCase().includes(termino)) ||
        (c.ACTIVIDAD && c.ACTIVIDAD.toLowerCase().includes(termino))
      );
    }

    this.cursosFiltrados = filtrados;
    this.cdr.detectChanges();
  }

  cargarAreas() {
    this.catalogosService.getAreasTematicas().subscribe({
      next: (res: any) => {
        this.listaAreas = Array.isArray(res) ? res : (res.data || []);
      },
      error: (err) => console.error('Error al cargar áreas temáticas:', err)
    });
  }

  abrirModalEditar(event: Event, curso: any) {
    // Evitamos que al dar clic en el botón se abra el detalle de trabajadores
    event.stopPropagation(); 
    
    // Clonamos el curso para no modificar la tabla hasta guardar en la BD
    this.cursoAEditar = { ...curso };
  }

  onAreaChange() {
    if (!this.cursoAEditar.clave_area_stps) return;
    
    const txt = this.cursoAEditar.clave_area_stps.trim().toUpperCase();
    
    // Buscamos si lo que escribió el usuario coincide con el catálogo
    const sel = this.listaAreas.find((a: any) =>
      a.clave?.toUpperCase() === txt ||
      a.nombre_area?.toUpperCase() === txt ||
      `${a.clave} - ${a.nombre_area}`.toUpperCase() === txt
    );

    if (sel) {
      // AHORA SÍ GUARDAMOS TODO EL TEXTO COMPLETO
      // Se guardará algo como: "1000 - Producción" en tu base de datos
      this.cursoAEditar.clave_area_stps = `${sel.clave} - ${sel.nombre_area}`;
    }
  }

  guardarEdicion() {
    // 1. Hacemos una copia limpia de los datos
    const datosParaGuardar = { ...this.cursoAEditar };
    
    // 2. Le borramos el ID al objeto (para que MariaDB no intente sobreescribir la Llave Primaria)
    delete datosParaGuardar.id_interno;

    // 3. Enviamos los datos limpios al servidor
    this.cursosService.updateCurso(this.cursoAEditar.id_interno, datosParaGuardar).subscribe({
      next: () => {
        this.noti.toastExito('Curso actualizado correctamente');
        
        const modalEl = document.getElementById('modalEditarCurso');
        if (modalEl) Modal.getInstance(modalEl)?.hide();

        // 🚀 SOLUCIÓN: Actualizamos los datos localmente en lugar de recargar toda la base de datos

        // A) Actualizamos en la lista maestra (invisible)
        const indexMaestro = this.cursos.findIndex(c => c.id_interno === this.cursoAEditar.id_interno);
        if (indexMaestro !== -1) {
          this.cursos[indexMaestro] = { ...this.cursos[indexMaestro], ...datosParaGuardar };
        }

        // B) Actualizamos en la lista filtrada (la que estás viendo en pantalla)
        const indexPantalla = this.cursosFiltrados.findIndex(c => c.id_interno === this.cursoAEditar.id_interno);
        if (indexPantalla !== -1) {
          this.cursosFiltrados[indexPantalla] = { ...this.cursosFiltrados[indexPantalla], ...datosParaGuardar };
        }

        // Refrescamos la vista para que aplique los cambios sin mover el scroll
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al editar:', err);
        this.noti.mostrarError('Error', 'No se pudo actualizar el curso');
      }
    });
  }

  eliminar(event: Event, id: any): void {
    event.stopPropagation(); 
    
    if (!id) return;
    if (confirm('¿Deseas eliminar este curso permanentemente?')) {
      this.cursosService.deleteCurso(id).subscribe({
        next: () => {
          this.cursos = this.cursos.filter((c) => c.id_interno !== id);
          this.buscar(); 
          this.cdr.detectChanges(); 
        },
        error: (err) => alert('Error al eliminar el curso. Revisa que no tenga trabajadores vinculados.'),
      });
    }
  }

  verDetalleTrabajadores(curso: any) {
    this.router.navigate(['/curso-detalle', curso.id_interno]);
  }
}