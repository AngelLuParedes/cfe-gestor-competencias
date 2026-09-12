import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../servicios/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentUser = this.authService.currentUserValue;

    if (currentUser && this.authService.isAuthenticated) {
      const requiredRole = route.data['role'];
      
      if (requiredRole) {
        if (requiredRole === 'admin' && !this.authService.isAdmin) {
          this.router.navigate(['/']);
          return false;
        }
        
        if (requiredRole === 'supervisor' && !this.authService.isSupervisor) {
          this.router.navigate(['/']);
          return false;
        }
      }
      
      history.pushState(null, '', location.href);
      
      return true;
    }

    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: state.url },
      replaceUrl: true 
    });
    
    return false;
  }
}