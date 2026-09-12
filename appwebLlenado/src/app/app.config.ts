import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
// 1. Importamos 'withInterceptors' para poder agregar el escudo de errores
import { provideHttpClient, withInterceptorsFromDi, withInterceptors } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth-interceptor';
// 2. Importamos el nuevo interceptor que creaste en el paso 1
import { errorInterceptor } from './error.interceptor'; 
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Manejo global de errores del navegador
    provideBrowserGlobalErrorListeners(),

    // Configuración del Router con animaciones y paso de parámetros automático
    provideRouter(
      routes, 
      withComponentInputBinding(), 
      withViewTransitions()
    ),

    // 3. Configuración de HTTP: 
    // Mezclamos el nuevo interceptor de errores y permitimos los de clase (Auth)
    provideHttpClient(
      withInterceptors([errorInterceptor]), // <-- Escudo visual de caída del servidor
      withInterceptorsFromDi()              // <-- Permite que funcione el AuthInterceptor de abajo
    ),

    // Proveedor del Interceptor para adjuntar el Token en cada petición
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};