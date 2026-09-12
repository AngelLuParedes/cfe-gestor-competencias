import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse, Usuario, RegisterRequest } from '../modelos/Usuario';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:3000/api/auth';
  private currentUserSubject: BehaviorSubject<Usuario | null>;
  public currentUser: Observable<Usuario | null>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const userStorage = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<Usuario | null>(
      userStorage ? JSON.parse(userStorage) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): Usuario | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.getToken();
  }

  public get isAdmin(): boolean {
    return this.currentUserValue?.rol === 'admin';
  }

  public get isSupervisor(): boolean {
    const rol = this.currentUserValue?.rol;
    return rol === 'admin' || rol === 'supervisor';
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.token && response.usuario) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.usuario));
            this.currentUserSubject.next(response.usuario);
            
            history.pushState(null, '', location.href);
            window.addEventListener('popstate', this.preventBackNavigation);
          }
        })
      );
  }

  private preventBackNavigation = () => {
    if (this.isAuthenticated) {
      history.pushState(null, '', location.href);
    }
  };

  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, data);
  }

  /** Solicita el restablecimiento de contraseña usando email o clave de 5 caracteres */
  recuperarPassword(identificador: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { identificador });
  }

  logout(): void {
    const token = this.getToken();
    
    window.removeEventListener('popstate', this.preventBackNavigation);
    
    if (token) {
      this.http.post(`${this.baseUrl}/logout`, {}).subscribe({
        next: () => {
          this.clearSessionAndRedirect();
        },
        error: () => {
          this.clearSessionAndRedirect();
        }
      });
    } else {
      this.clearSessionAndRedirect();
    }
  }

  private clearSessionAndRedirect(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    
    window.removeEventListener('popstate', this.preventBackNavigation);
    
    this.router.navigate(['/login']).then(() => {
      history.replaceState(null, '', '/login');
    });
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  verificarToken(): Observable<any> {
    return this.http.get(`${this.baseUrl}/verificar`);
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/cambiar-password`, {
      password_actual: passwordActual,
      password_nueva: passwordNueva
    });
  }

  actualizarPerfil(datos: Partial<Usuario>): Observable<any> {
    return this.http.put(`${this.baseUrl}/perfil`, datos).pipe(
      tap((response: any) => {
        if (response.usuario) {
          localStorage.setItem('currentUser', JSON.stringify(response.usuario));
          this.currentUserSubject.next(response.usuario);
        }
      })
    );
  }
}