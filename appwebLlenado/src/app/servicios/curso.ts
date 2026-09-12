import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Curso } from '../modelos/Curso';

@Injectable({
  providedIn: 'root',
})
export class CursosService {
  API_URI = 'http://localhost:3000/app';

  constructor(private http: HttpClient) {}

  getCursos(): Observable<any> {
    return this.http.get(`${this.API_URI}/curso`);
  }

  getCurso(id: string | number): Observable<any> {
    return this.http.get(`${this.API_URI}/curso/${id}`);
  }

  getTrabajadoresPorCurso(id: string | number): Observable<any> {
    return this.http.get(`${this.API_URI}/curso/trabajadores/${id}`);
  }

  createCurso(curso: Curso): Observable<any> {
    return this.http.post(`${this.API_URI}/curso`, curso);
  }

  deleteCurso(id: string | number): Observable<any> {
    return this.http.delete(`${this.API_URI}/curso/${id}`);
  }

  updateCurso(id: string | number, updatedCurso: any): Observable<any> {
    return this.http.put(`${this.API_URI}/curso/${id}`, updatedCurso);
  }

  // Genera PDF individual — envía id_registro y fecha_inicio para
  // identificar el registro exacto y evitar traer el trabajador equivocado
  generarPdfIndividual(datos: any): Observable<Blob> {
    return this.http.post(`${this.API_URI}/constancias/generar-pdf`, datos, {
      responseType: 'blob'
    });
  }

  generarPdfLote(datos: any): Observable<Blob> {
    return this.http.post(`${this.API_URI}/constancias/generar-pdf-lote`, datos, {
      responseType: 'blob'
    });
  }

  // ✅ NUEVO: Resetear estado de un registro a "NO GENERADA"
  resetearEstadoRegistro(id_registro: number): Observable<any> {
    return this.http.put(`${this.API_URI}/constancias/resetear-estado/${id_registro}`, {});
  }

  generarPdfManual(datos: any): Observable<Blob> {
    return this.http.post(`${this.API_URI}/constancias/generar-pdf-manual`, datos, {
      responseType: 'blob'
    });
  }

  updateHistorialRegistro(idRegistro: number, datos: any): Observable<any> {
    return this.http.put(`${this.API_URI}/curso/historial/${idRegistro}`, datos);
  }
}