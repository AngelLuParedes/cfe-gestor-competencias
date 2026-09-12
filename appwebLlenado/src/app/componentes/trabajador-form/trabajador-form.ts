import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms'; 
import { Router, RouterModule } from '@angular/router';
import { TrabajadoresService } from '../../servicios/trabajadores';
import { CursosService } from '../../servicios/curso';
import { NotificacionesService } from '../../servicios/notificaciones';

@Component({
  selector: 'app-trabajador-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './trabajador-form.html'
})
export class TrabajadorForm implements OnInit {
  
  vincularCursoAhora: boolean = false;
  cursosDisponibles: any[] = [];
  
  // Banderas para mensajes de advertencia temporales
  errorRPE: boolean = false;
  errorCURP: boolean = false;

  trabajador: any = {
    RPE: '',
    CURP: '',
    NOMBRE_COMPLETO: '',
    clave_curso: '',
    fecha_inicio: '',
    fecha_termino: '',
    calificacion: 0
  };

  constructor(
    private tService: TrabajadoresService, 
    private cService: CursosService,
    private noti: NotificacionesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cService.getCursos().subscribe({
      next: (res: any) => this.cursosDisponibles = Array.isArray(res) ? res : (res.data || []),
      error: (err) => console.error('Error al cargar cursos:', err)
    });
  }

  // Lógica para quitar advertencia de RPE después de 3 segundos
  verificarRPE() {
    if (this.trabajador.RPE.length >= 5) {
      this.errorRPE = true;
      setTimeout(() => { this.errorRPE = false; }, 3000);
    }
  }

  // Lógica para quitar advertencia de CURP después de 3 segundos
  verificarCURP() {
    if (this.trabajador.CURP.length >= 18) {
      this.errorCURP = true;
      setTimeout(() => { this.errorCURP = false; }, 3000);
    }
  }

  guardar(form: NgForm) {
    if (form.invalid) {
      this.noti.mostrarError('Datos Incorrectos', 'Por favor, revisa que el RPE (5 chars) y la CURP (18 chars) sean correctos.');
      return;
    }

    this.trabajador.RPE = this.trabajador.RPE.toUpperCase();
    this.trabajador.CURP = this.trabajador.CURP.toUpperCase();
    this.trabajador.NOMBRE_COMPLETO = this.trabajador.NOMBRE_COMPLETO.toUpperCase();

    this.tService.createTrabajador(this.trabajador).subscribe({
      next: () => {
        this.noti.toastExito('Trabajador registrado con éxito');
        this.router.navigate(['/trabajadores']);
      },
      error: (err) => {
        const mensaje = err.error?.message || 'Error al conectar con el servidor';
        this.noti.mostrarError('No se pudo registrar', mensaje);
      }
    });
  }
}