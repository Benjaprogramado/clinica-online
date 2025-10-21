import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';
import { UserService } from '../services/user';
import { map, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const especialistaAprobadoGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        router.navigate(['/login']);
        return of(false);
      }

      if (user.role !== 'especialista') {
        return of(true);
      }

      return userService.getUsuarioById(user.uid).pipe(
        map(especialista => {
          if (especialista?.aprobado) {
            return true;
          }
          
          router.navigate(['/pendiente-aprobacion']);
          return false;
        })
      );
    })
  );
};