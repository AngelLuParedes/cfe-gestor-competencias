import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Trabajador } from '../modelos/Trabajador';

@Injectable({
  providedIn: 'root',
})
export class TrabajadoresService {
  API_URI = 'http://localhost:3000/app';

  constructor(private http: HttpClient) {}

  getTrabajadores(): Observable<any> {
    return this.http.get(`${this.API_URI}/trabajadores`);
  }

  getTrabajador(rpe: string): Observable<any> {
    return this.http.get(`${this.API_URI}/trabajadores/${rpe}`);
  }

  createTrabajador(trabajador: Trabajador): Observable<any> {
    return this.http.post(`${this.API_URI}/trabajadores`, trabajador);
  }

  deleteTrabajador(rpe: string): Observable<any> {
    return this.http.delete(`${this.API_URI}/trabajadores/${rpe}`);
  }

  updateTrabajador(rpe: string, updatedTrabajador: Trabajador): Observable<any> {
    return this.http.put(`${this.API_URI}/trabajadores/${rpe}`, updatedTrabajador);
  }

  // Endpoint para el historial de cursos del trabajador
  getCursosPorTrabajador(rpe: string): Observable<any> {
    return this.http.get<any>(`${this.API_URI}/trabajadores/${rpe}/cursos`);
  }

}
