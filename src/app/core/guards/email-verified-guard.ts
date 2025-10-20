import { CanActivateFn } from '@angular/router';

export const emailVerifiedGuard: CanActivateFn = (route, state) => {
  return true;
};
