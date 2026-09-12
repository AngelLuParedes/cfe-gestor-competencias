export interface Usuario {
  id_usuario?: number;
  nombre_usuario: string;
  email: string;
  nombre_completo: string;
  rol: 'admin' | 'supervisor' | 'usuario';
  activo?: boolean;
  ultimo_acceso?: Date;
  fecha_creacion?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
  mensaje?: string;
}

export interface RegisterRequest {
  nombre_usuario: string;
  email: string;
  password: string;
  nombre_completo: string;
  rol?: 'admin' | 'supervisor' | 'usuario';
}