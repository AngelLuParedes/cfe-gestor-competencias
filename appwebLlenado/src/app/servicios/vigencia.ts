import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VigenciaService {
  API_URI = 'http://localhost:3000/app';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los trabajadores con su historial de cursos completo
   */
  getVigenciaCompleta(): Observable<any> {
    return this.http.get(`${this.API_URI}/vigencia`);
  }

  /**
   * Obtiene los trabajadores filtrados por mes de vencimiento
   * @param mes Número del mes (1-12)
   */
  getVigenciaPorMes(mes: number): Observable<any> {
    return this.http.get(`${this.API_URI}/vigencia/mes/${mes}`);
  }

  /**
   * Obtiene solo los cursos vencidos o próximos a vencer (próximos 30 días)
   */
  getAlertasVigencia(): Observable<any> {
    return this.http.get(`${this.API_URI}/vigencia/alertas`);
  }
}