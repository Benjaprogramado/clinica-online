import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Auth } from '@angular/fire/auth';

export const emailVerifiedGuard: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const user = auth.currentUser;

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.emailVerified) {
    return true;
  }

  router.navigate(['/verificar-email']);
  return false;
};