import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing').then(m => m.LandingComponent),
    title: 'Clínica Online'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.LoginComponent),
    title: 'Iniciar Sesión'
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/registro/registro').then(m => m.RegistroComponent),
    title: 'Registro'
  },
  {
    path: 'admin/usuarios',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] },
    loadComponent: () =>
      import('./features/admin/usuarios/usuarios').then(m => m.Usuarios),
    title: 'Gestión de Usuarios'
  },
  {
    path: '**',
    redirectTo: ''
  }
];