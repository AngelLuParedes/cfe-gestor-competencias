import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ResultadoCarga {
  mensaje:    string;
  insertados: number;
  omitidos:   number;
}

export interface ConteoTabla {
  insertados:   number;
  actualizados: number;
  omitidos:     number;
}

export interface ResultadoCompleto {
  mensaje:           string;
  cursos:            ConteoTabla;
  trabajadores:      ConteoTabla;
  historial:         ConteoTabla;
  totalInsertados:   number;
  totalActualizados: number;
  totalOmitidos:     number;
  totalFilas:        number;
}

@Injectable({ providedIn: 'root' })
export class ExcelService {

  private readonly apiUrl = 'http://localhost:3000/api/carga-excel';

  constructor(private http: HttpClient) {}

  /** Carga individual: /cursos, /trabajadores o /historial */
  subirExcel(archivo: File, tabla: string): Observable<ResultadoCarga> {
    const form = new FormData();
    form.append('archivo', archivo, archivo.name);
    return this.http
      .post<ResultadoCarga>(`${this.apiUrl}/${tabla}`, form)
      .pipe(catchError(this.manejarError));
  }

  /** Carga completa: reporte CCHL → separa en 3 tablas automáticamente */
  subirExcelCompleto(archivo: File): Observable<ResultadoCompleto> {
    const form = new FormData();
    form.append('archivo', archivo, archivo.name);
    return this.http
      .post<ResultadoCompleto>(`${this.apiUrl}/completo`, form)
      .pipe(catchError(this.manejarError));
  }

  private manejarError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Ocurrió un error inesperado.';
    if (error.status === 0) {
      mensaje = 'No se pudo conectar con el servidor.';
    } else if (error.status === 400 || error.status === 500) {
      mensaje = (error.error as { mensaje?: string })?.mensaje || mensaje;
    }
    return throwError(() => new Error(mensaje));
  }
}