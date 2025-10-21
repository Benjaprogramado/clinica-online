import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, take } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data['roles'] as string[];

  return authService.user$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }

      if (expectedRoles && expectedRoles.includes(user.role)) {
        return true;
      }

      // Redirigir según el rol del usuario
      switch (user.role) {
        case 'paciente':
          router.navigate(['/paciente/mis-turnos']);
          break;
        case 'especialista':
          router.navigate(['/especialista/mis-turnos']);
          break;
        case 'administrador':
          router.navigate(['/admin/usuarios']);
          break;
        default:
          router.navigate(['/']);
      }
      
      return false;
    })
  );
};