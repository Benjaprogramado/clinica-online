import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { especialistaAprobadoGuard } from './core/guards/especialista-aprobado-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing').then(m => m.LandingComponent),
    title: 'Clínica Online',
    data: { animation: 'fade' }
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.LoginComponent),
    title: 'Iniciar Sesión',
    data: { animation: 'fade' }
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/registro/registro').then(m => m.RegistroComponent),
    title: 'Registro',
    data: { animation: 'fade' }
  },
  {
    path: 'registro-paciente',
    loadComponent: () =>
      import('./features/auth/registro-paciente/registro-paciente').then(m => m.RegistroPacienteComponent),
    title: 'Registro Paciente',
    data: { animation: 'slideUp' }
  },
  {
    path: 'registro-especialista',
    loadComponent: () =>
      import('./features/auth/registro-especialista/registro-especialista').then(m => m.RegistroEspecialistaComponent),
    title: 'Registro Especialista',
    data: { animation: 'slideUp' }
  },
  {
    path: 'verificar-email',
    loadComponent: () =>
      import('./features/auth/verificar-email/verificar-email').then(m => m.VerificarEmail),
    title: 'Verificar Email',
    data: { animation: 'fade' }
  },
  {
    path: 'pendiente-aprobacion',
    loadComponent: () =>
      import('./features/auth/pendiente-aprobacion/pendiente-aprobacion').then(m => m.PendienteAprobacion),
    title: 'Pendiente de Aprobación',
    data: { animation: 'fade' }
  },
  // Rutas Admin
  {
    path: 'admin/usuarios',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'], animation: 'fade' },
    loadComponent: () =>
      import('./features/admin/usuarios/usuarios').then(m => m.Usuarios),
    title: 'Gestión de Usuarios'
  },
  {
    path: 'admin/turnos',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'], animation: 'fade' },
    loadComponent: () =>
      import('./features/admin/turnos/turnos').then(m => m.TurnosAdminComponent),
    title: 'Gestión de Turnos'
  },
  {
    path: 'admin/estadisticas',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'], animation: 'slideUp' },
    loadComponent: () =>
      import('./features/admin/estadisticas/estadisticas').then(m => m.EstadisticasAdminComponent),
    title: 'Estadísticas'
  },
  {
    path: 'admin/solicitar-turno',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'], modoTurno: 'admin', animation: 'slideUp' },
    loadComponent: () =>
      import('./features/paciente/solicitar-turno/solicitar-turno').then(m => m.SolicitarTurnoComponent),
    title: 'Solicitar Turno'
  },
  // Rutas Paciente
  {
    path: 'paciente/solicitar-turno',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['paciente'], animation: 'slideUp' },
    loadComponent: () =>
      import('./features/paciente/solicitar-turno/solicitar-turno').then(m => m.SolicitarTurnoComponent),
    title: 'Solicitar Turno'
  },
  {
    path: 'paciente/mis-turnos',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['paciente'], animation: 'fade' },
    loadComponent: () =>
      import('./features/paciente/mis-turnos/mis-turnos').then(m => m.MisTurnosPacienteComponent),
    title: 'Mis Turnos'
  },
  {
    path: 'paciente/mi-perfil',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['paciente'], animation: 'slideUp' },
    loadComponent: () =>
      import('./features/paciente/mi-perfil/mi-perfil').then(m => m.MiPerfilPacienteComponent),
    title: 'Mi Perfil'
  },
  // Rutas Especialista
  {
    path: 'especialista/mis-turnos',
    canActivate: [authGuard, roleGuard, especialistaAprobadoGuard],
    data: { roles: ['especialista'], animation: 'fade' },
    loadComponent: () =>
      import('./features/especialista/mis-turnos/mis-turnos').then(m => m.MisTurnosEspecialistaComponent),
    title: 'Mis Turnos'
  },
  {
    path: 'especialista/pacientes',
    canActivate: [authGuard, roleGuard, especialistaAprobadoGuard],
    data: { roles: ['especialista'], animation: 'slideUp' },
    loadComponent: () =>
      import('./features/especialista/pacientes/pacientes').then(m => m.PacientesAtendidosComponent),
    title: 'Pacientes Atendidos'
  },
  {
    path: 'especialista/mi-perfil',
    canActivate: [authGuard, roleGuard, especialistaAprobadoGuard],
    data: { roles: ['especialista'], animation: 'fade' },
    loadComponent: () =>
      import('./features/especialista/mi-perfil/mi-perfil').then(m => m.MiPerfilEspecialistaComponent),
    title: 'Mi Perfil'
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found').then(m => m.NotFound),
    title: 'Página No Encontrada',
    data: { animation: 'fade' }
  }
];