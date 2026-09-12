import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CatalogosService {
  // Asegúrate de que esta URL coincida con tu backend
  API_URI = 'http://localhost:3000/app/catalogos';

  constructor(private http: HttpClient) { }

  getOcupaciones(): Observable<any> {
    return this.http.get(`${this.API_URI}/ocupaciones`);
  }

  getAreasTematicas(): Observable<any> {
    return this.http.get(`${this.API_URI}/areas`);
  }
}