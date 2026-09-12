import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CursosService } from '../../servicios/curso';
import { Curso } from '../../modelos/Curso';

@Component({
  selector: 'app-curso-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './curso-form.html'
})
export class CursoForm {
  // Inicializamos con valores vacíos para el CATÁLOGO
  // Nota: Eliminamos fechas y calificación de aquí
  curso: Curso = {
    SUBPROCESO: '',
    CLAVE_DEL_AREA: '',
    AREA: '',
    AÑO: new Date().getFullYear(),
    ACTIVIDAD: '',
    CLAVE_ACTIVIDAD: '',
    CLAVE_CURSO: '',
    NOMBRE_DEL_CURSO: '',
    DURACION_REAL_HRS: 0,
    clave_area_stps: ''
  };

  constructor(private cService: CursosService, private router: Router) {}

  guardar() {
    this.cService.createCurso(this.curso).subscribe({
      next: () => {
        // Puedes cambiar esto por tu servicio de notificaciones bonito
        alert('Curso registrado en el catálogo correctamente');
        this.router.navigate(['/curso']);
      },
      error: (err) => {
        console.error('Error:', err);
        alert('Error al guardar. Verifica que la clave del curso no esté repetida.');
      }
    });
  }
}