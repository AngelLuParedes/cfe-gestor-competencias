import { Routes } from '@angular/router';
import { LoginComponent } from './componentes/login/login';
import { CursoList } from './componentes/curso-list/curso-list';
import { TrabajadoresLista } from './componentes/trabajadores-list/trabajadores-list';
import { CursoDetalle } from './componentes/curso-detalle/curso-detalle';
import { GeneradorDc3 } from './componentes/generar-dc3/generar-dc3';
import { CargaExcelComponent } from './componentes/carga-excel/carga-excel';
import { AuthGuard } from './guards/auth-guard';
import { VigenciaCursosComponent } from './vigencia-cursos/vigencia-cursos';


export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent 
  },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'curso', pathMatch: 'full' },
      
      { path: 'curso', component: CursoList },
      { path: 'curso-detalle/:id', component: CursoDetalle },
      
      { path: 'trabajadores', component: TrabajadoresLista },
      
      { path: 'generar-dc3', component: GeneradorDc3 },
      
      { path: 'carga-excel', component: CargaExcelComponent },

      { path: 'vigencia', component: VigenciaCursosComponent },
    ]
  },
  { 
    path: '**', 
    redirectTo: 'login' 
  }
];