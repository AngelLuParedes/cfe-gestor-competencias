import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constancia } from '../modelos/Constancia'; 

@Injectable({
  providedIn: 'root',
})
export class ConstanciasService {

  // ✅ La URI base apunta a /app/constancias
  API_URI = 'http://localhost:3000/app/constancias';

  constructor(private http: HttpClient) { }

  getConstancias(): Observable<any> {
    return this.http.get(`${this.API_URI}`);
  }

  createConstancia(constancia: Constancia): Observable<any> {
    return this.http.post(`${this.API_URI}`, constancia);
  }

  deleteConstancia(id: string | number): Observable<any> {
    return this.http.delete(`${this.API_URI}/${id}`);
  }

  generarWord(datos: Constancia): Observable<Blob> {
    return this.http.post(`${this.API_URI}/generar`, datos, {
      responseType: 'blob' 
    });
  }

  getHistorial(rpe: string): Observable<any> {
    return this.http.get(`${this.API_URI}/historial/${rpe}`);
  }

  // ✅ CORRECCIÓN: Antes era `${this.API_URI}/constancias/generar-pdf`
  // lo que resultaba en .../app/constancias/constancias/generar-pdf (URL duplicada)
  generarPdfIndividual(datos: any): Observable<Blob> {
    return this.http.post(`${this.API_URI}/generar-pdf`, datos, {
      responseType: 'blob' 
    });
  }

  generarPdfLote(datos: any): Observable<Blob> {
    return this.http.post(`${this.API_URI}/generar-pdf-lote`, datos, {
      responseType: 'blob' 
    });
  }
}