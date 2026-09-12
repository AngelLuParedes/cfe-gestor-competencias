import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../servicios/auth';
import { LoginRequest } from '../../modelos/Usuario';

interface NuevoUsuario {
  nombre_completo: string;
  nombre_usuario:  string;
  email:           string;
  password:        string;
  rol:             'usuario' | 'supervisor' | 'admin';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit, OnDestroy {

  // ── Login ─────────────────────────────────────────────────────────────────
  credentials: LoginRequest = { email: '', password: '' };
  cargando        = false;
  mostrarPassword = false;
  mensajeError    = '';
  returnUrl       = '/';

  // ── Modal registro ────────────────────────────────────────────────────────
  mostrarModalRegistro = false;
  registrando          = false;
  mostrarPassReg       = false;
  errorRegistro        = '';
  exitoRegistro        = '';

  nuevoUsuario: NuevoUsuario = {
    nombre_completo: '',
    nombre_usuario:  '',
    email:           '',
    password:        '',
    rol:             'usuario'
  };

  // ── Modal recuperar contraseña ────────────────────────────────────────────
  mostrarModalRecuperar  = false;
  recuperando            = false;
  identificadorRecuperar = '';
  errorRecuperar         = '';
  exitoRecuperar         = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdRef: ChangeDetectorRef
  ) {}

  // ── Ciclo de vida ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/']);
      return;
    }
    this.limpiarEstadoPrevio();
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    history.pushState(null, '', location.href);
    window.addEventListener('popstate', this.onBackButton);
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.onBackButton);
  }

  private onBackButton = () => {
    if (!this.authService.isAuthenticated) {
      history.pushState(null, '', location.href);
    }
  };

  private limpiarEstadoPrevio(): void {
    if (!this.authService.isAuthenticated) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.mensajeError = 'Por favor ingresa tu correo o clave y tu contraseña';
      return;
    }

    this.cargando     = true;
    this.mensajeError = '';

    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate([this.returnUrl], { replaceUrl: true }).then(() => {
          this.credentials = { email: '', password: '' };
        });
      },
      error: (error) => {
        this.cargando = false;
        if      (error.status === 401) this.mensajeError = 'Correo/clave o contraseña incorrectos';
        else if (error.status === 403) this.mensajeError = 'Tu cuenta está desactivada. Contacta al administrador';
        else if (error.status === 0)   this.mensajeError = 'No se puede conectar con el servidor. Verifica tu conexión';
        else                           this.mensajeError = 'Error al iniciar sesión. Intenta de nuevo';
        console.error('Error de login:', error);
      }
    });
  }

  togglePassword(): void { this.mostrarPassword = !this.mostrarPassword; }
  limpiarError():   void { this.mensajeError = ''; }

  // ── Modal registro ────────────────────────────────────────────────────────
  abrirModalRegistro(): void {
    this.resetNuevoUsuario();
    this.errorRegistro  = '';
    this.exitoRegistro  = '';
    this.mostrarModalRegistro = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModal(): void {
    this.mostrarModalRegistro = false;
    document.body.style.overflow = '';
    this.resetNuevoUsuario();
    this.errorRegistro = '';
    this.exitoRegistro = '';
  }

  /** Cierra al hacer clic en el overlay (fondo oscuro), no en el box */
  cerrarModalRegistro(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModal();
    }
  }

  onRegistro(): void {
    const { nombre_completo, nombre_usuario, email, password, rol } = this.nuevoUsuario;

    if (!nombre_completo || !nombre_usuario || !email || !password) {
      this.errorRegistro = 'Todos los campos marcados con * son obligatorios';
      return;
    }

    if (password.length < 6) {
      this.errorRegistro = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.registrando   = true;
    this.errorRegistro = '';
    this.exitoRegistro = '';

    this.authService.register({ nombre_completo, nombre_usuario, email, password, rol })
      .subscribe({
        next: (res) => {
          console.log("¡Éxito! Respuesta del servidor:", res); // 👈 Para confirmar en F12
          
          this.registrando   = false;
          this.exitoRegistro = `✅ Usuario "${nombre_usuario}" creado correctamente`;
          
          this.cdRef.detectChanges(); // 🚀 OBLIGA a Angular a actualizar la pantalla (quita el "Creando...")

          // Cerrar modal automáticamente tras 2 segundos
          setTimeout(() => {
            this.cerrarModal();
            this.cdRef.detectChanges(); // 🚀 OBLIGA a actualizar de nuevo tras cerrar el modal
          }, 2200);
        },
        error: (err) => {
          console.error("Angular detectó un error:", err); // 👈 Para confirmar en F12
          
          this.registrando = false;
          if (err.status === 409) {
            this.errorRegistro = 'El correo o nombre de usuario ya está registrado';
          } else if (err.status === 0) {
            this.errorRegistro = 'No se puede conectar con el servidor';
          } else {
            this.errorRegistro = err.error?.message || 'Error al crear el usuario';
          }

          this.cdRef.detectChanges(); // 🚀 OBLIGA a Angular a mostrar la alerta de error
        }
      });
  }

  private resetNuevoUsuario(): void {
    this.nuevoUsuario = {
      nombre_completo: '',
      nombre_usuario:  '',
      email:           '',
      password:        '',
      rol:             'usuario'
    };
    this.mostrarPassReg = false;
  }

  // ── Modal recuperar contraseña ────────────────────────────────────────────
  abrirModalRecuperar(): void {
    this.identificadorRecuperar = '';
    this.errorRecuperar = '';
    this.exitoRecuperar = '';
    this.mostrarModalRecuperar = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModalRecuperar(): void {
    this.mostrarModalRecuperar = false;
    document.body.style.overflow = '';
    this.identificadorRecuperar = '';
    this.errorRecuperar = '';
    this.exitoRecuperar = '';
  }

  /** Cierra al hacer clic en el overlay (fondo oscuro), no en el box */
  cerrarModalRecuperarOverlay(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModalRecuperar();
    }
  }

  onRecuperarPassword(): void {
    if (!this.identificadorRecuperar) {
      this.errorRecuperar = 'Ingresa tu correo o clave de acceso';
      return;
    }

    this.recuperando   = true;
    this.errorRecuperar = '';
    this.exitoRecuperar = '';

    this.authService.recuperarPassword(this.identificadorRecuperar).subscribe({
      next: () => {
        this.recuperando = false;
        this.exitoRecuperar = 'Si el usuario existe, se enviaron instrucciones para restablecer tu contraseña';
        setTimeout(() => this.cerrarModalRecuperar(), 2500);
      },
      error: (err) => {
        this.recuperando = false;
        this.errorRecuperar = err.status === 0
          ? 'No se puede conectar con el servidor'
          : 'Error al procesar la solicitud';
      }
    });
  }
}