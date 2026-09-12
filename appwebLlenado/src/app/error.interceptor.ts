import { HttpInterceptorFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      // El status 0 es la firma inconfundible de que el Servidor Node.js está apagado o muerto
      if (error.status === 0) {
        alert(
          "ERROR CRÍTICO DE CONEXIÓN \n\n" +
          "El servidor del sistema se ha apagado o desconectado inesperadamente.\n\n" +
          "INSTRUCCIONES PARA SOLUCIONARLO:\n" +
          "1. Cierre esta ventana del navegador.\n" +
          "2. Vaya a la carpeta del sistema o a los iconos con la funcion vinculada.\n" +
          "3. Ejecute el archivo DETENER.bat.\n" +
          "4. Ejecute el archivo INICIAR.bat.\n\n" +
          "Por favor, no intente guardar datos hasta hacer este reinicio."
        );
      }
      return throwError(() => error);
    })
  );
};