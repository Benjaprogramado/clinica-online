import { Routes } from '@angular/router';

export const routes: Routes = [
    {
      path: '',
      loadComponent: () =>
        import('./features/landing/landing').then(m => m.LandingComponent),
      title: 'Clínica Online - Inicio'
    },
    {
      path: 'login',
      loadComponent: () =>
        import('./features/auth/login/login').then(m => m.LoginComponent),
      title: 'Iniciar Sesión'
    },
    {
      path: '**',
      redirectTo: ''
    }
  ];
