import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
// import { especialistaAprobadoGuard } from './core/guards/especialista-aprobado-guard';

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
    path: 'registro-paciente',
    loadComponent: () =>
      import('./features/auth/registro-paciente/registro-paciente').then(m => m.RegistroPacienteComponent),
    title: 'Registro Paciente'
  },
  {
    path: 'registro-especialista',
    loadComponent: () =>
      import('./features/auth/registro-especialista/registro-especialista').then(m => m.RegistroEspecialistaComponent),
    title: 'Registro Especialista'
  },
  {
    path: 'verificar-email',
    loadComponent: () =>
      import('./features/auth/verificar-email/verificar-email').then(m => m.VerificarEmail),
    title: 'Verificar Email'
  },
  {
    path: 'pendiente-aprobacion',
    loadComponent: () =>
      import('./features/auth/pendiente-aprobacion/pendiente-aprobacion').then(m => m.PendienteAprobacion),
    title: 'Pendiente de Aprobación'
  },
  {
    path: 'admin/usuarios',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] },
    loadComponent: () =>
      import('./features/admin/usuarios/usuarios').then(m => m.Usuarios),
    title: 'Gestión de Usuarios'
  },
  // TODO: Agregar rutas de especialista y paciente cuando se implementen los módulos
  // {
  //   path: 'especialista',
  //   canActivate: [authGuard, roleGuard, especialistaAprobadoGuard],
  //   data: { roles: ['especialista'] },
  //   loadChildren: () =>
  //     import('./features/especialista/especialista.routes').then(m => m.routes)
  // },
  // {
  //   path: 'paciente',
  //   canActivate: [authGuard, roleGuard],
  //   data: { roles: ['paciente'] },
  //   loadChildren: () =>
  //     import('./features/paciente/paciente.routes').then(m => m.routes)
  // },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found').then(m => m.NotFound),
    title: 'Página No Encontrada'
  }
];