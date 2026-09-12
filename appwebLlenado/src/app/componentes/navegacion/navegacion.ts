import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../servicios/auth';
import { NotificacionesService } from '../../servicios/notificaciones'; // <-- Inyectamos el servicio

@Component({
  selector: 'app-navegacion',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navegacion.html',
  styleUrls: ['./navegacion.css']
})
export class NavegacionComponent {
  
  constructor(
    public authService: AuthService,
    private noti: NotificacionesService // <-- Lo agregamos al constructor
  ) {}

  // Convertimos la función a asíncrona (async) para poder esperar la alerta
  async logout(): Promise<void> { 
    // Usamos la alerta con diseño CFE
    const confirmacion = await this.noti.confirmarAccion(
      '¿Cerrar Sesión?',
      '¿Estás seguro de que deseas salir del sistema?',
      'Sí, salir'
    );
    
    if (confirmacion) {
      console.log('Cerrando sesión...');
      this.authService.logout(); // Tu servicio de auth ya se encarga de redirigir
      this.noti.toastExito('Has salido del sistema correctamente'); // Mensaje de éxito
    }
  }

  get nombreUsuario(): string {
    return this.authService.currentUserValue?.nombre_completo || 'Usuario';
  }

  get rolUsuario(): string {
    const rol = this.authService.currentUserValue?.rol;
    
    switch(rol) {
      case 'admin':
        return 'Administrador';
      case 'supervisor':
        return 'Supervisor';
      case 'usuario':
        return 'Usuario';
      default:
        return 'Usuario';
    }
  }

  get emailUsuario(): string {
    return this.authService.currentUserValue?.email || '';
  }
}