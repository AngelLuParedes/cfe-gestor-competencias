import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {

  constructor() { }

  // 1. Toast de Éxito (Esquina superior derecha)
  toastExito(mensaje: string) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      iconColor: '#007A33', // Verde CFE
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });

    Toast.fire({
      icon: 'success',
      title: mensaje
    });
  }

  // 2. Alerta de Error
  mostrarError(titulo: string, mensaje: string) {
    Swal.fire({
      icon: 'error',
      title: titulo,
      text: mensaje,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#007A33' // Verde CFE
    });
  }

  // 3. Confirmación (Para cerrar sesión, eliminar, etc.)
  async confirmarAccion(titulo: string, texto: string, textoBoton: string = 'Sí, continuar'): Promise<boolean> {
    const result = await Swal.fire({
      title: titulo,
      text: texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#007A33', // Verde CFE
      cancelButtonColor: '#6c757d',  // Gris Neutro
      confirmButtonText: `<i class="fa-solid fa-check me-1"></i> ${textoBoton}`,
      cancelButtonText: '<i class="fa-solid fa-xmark me-1"></i> Cancelar',
      reverseButtons: true
    });

    return result.isConfirmed;
  }
}