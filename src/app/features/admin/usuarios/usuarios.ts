import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../../core/services/user';
import { Usuario } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification';
import { TurnoService } from '../../../core/services/turno';
import { ReportService } from '../../../core/services/report';
import { LoadingService } from '../../../core/services/loading';
import { FormUsuario } from './form-usuario/form-usuario';
import { HoverElevateDirective } from '../../../shared/directives/hover-elevate.directive';
import { RoleBadgeDirective } from '../../../shared/directives/role-badge.directive';
import { NombreCompletoPipe } from '../../../shared/pipes/nombre-completo.pipe';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, FormUsuario, HoverElevateDirective, RoleBadgeDirective, NombreCompletoPipe],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss'
})
export class Usuarios implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private turnoService = inject(TurnoService);
  private reportService = inject(ReportService);
  private loadingService = inject(LoadingService);

  usuarios = signal<Usuario[]>([]);
  cargando = signal(false);
  filtroRol = signal<'todos' | 'paciente' | 'especialista' | 'administrador'>('todos');
  filtroAprobacion = signal<'todos' | 'aprobados' | 'pendientes'>('todos');
  mostrarFormulario = signal(false);

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  async cargarUsuarios(): Promise<void> {
    this.cargando.set(true);
    try {
      this.userService.getTodosLosUsuarios().subscribe({
        next: (usuarios) => {
          this.usuarios.set(usuarios);
          this.cargando.set(false);
        },
        error: (error) => {
          console.error('Error cargando usuarios:', error);
          this.cargando.set(false);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      this.cargando.set(false);
    }
  }

  async aprobarEspecialista(usuario: Usuario): Promise<void> {
    const nombreCompleto = usuario.nombre && usuario.apellido 
      ? `${usuario.nombre} ${usuario.apellido}` 
      : usuario.email || 'este especialista';
    
    const confirmado = await this.notificationService.confirm(
      'Aprobar Especialista',
      `¿Estás seguro de que deseas aprobar a ${nombreCompleto}? Una vez aprobado, podrá iniciar sesión en la plataforma.`,
      'Aprobar',
      'Cancelar'
    );

    if (!confirmado) {
      return;
    }

    try {
      await this.userService.aprobarEspecialista(usuario.uid);
      await this.notificationService.showSuccess(
        'Especialista Aprobado',
        `${nombreCompleto} ha sido aprobado correctamente.`
      );
      this.cargarUsuarios();
    } catch (error) {
      console.error('Error aprobando especialista:', error);
      await this.notificationService.showError(
        'Error',
        'No se pudo aprobar al especialista'
      );
    }
  }

  async habilitarUsuario(usuario: Usuario): Promise<void> {
    try {
      await this.userService.habilitarUsuario(usuario.uid);
      await this.notificationService.showSuccess(
        'Éxito',
        'Usuario habilitado correctamente'
      );
      this.cargarUsuarios();
    } catch (error) {
      console.error('Error habilitando usuario:', error);
      await this.notificationService.showError(
        'Error',
        'No se pudo habilitar al usuario'
      );
    }
  }

  async deshabilitarUsuario(usuario: Usuario): Promise<void> {
    const nombreCompleto = usuario.nombre && usuario.apellido
      ? `${usuario.nombre} ${usuario.apellido}`
      : usuario.email || 'este usuario';

    const confirmado = await this.notificationService.confirm(
      'Deshabilitar Usuario',
      `¿Estás seguro de que deseas deshabilitar a ${nombreCompleto}? El usuario no podrá iniciar sesión hasta que sea habilitado nuevamente.`,
      'Deshabilitar',
      'Cancelar'
    );

    if (!confirmado) {
      return;
    }

    try {
      await this.userService.deshabilitarUsuario(usuario.uid);
      await this.notificationService.showSuccess(
        'Usuario Deshabilitado',
        `${nombreCompleto} ha sido deshabilitado correctamente.`
      );
      this.cargarUsuarios();
    } catch (error) {
      console.error('Error deshabilitando usuario:', error);
      await this.notificationService.showError(
        'Error',
        'No se pudo deshabilitar al usuario'
      );
    }
  }

  filtrarUsuarios(): Usuario[] {
    let usuariosFiltrados = this.usuarios();

    // Filtrar por rol
    if (this.filtroRol() !== 'todos') {
      usuariosFiltrados = usuariosFiltrados.filter(u => u.role === this.filtroRol());
    }

    // Filtrar por aprobación (solo para especialistas)
    if (this.filtroAprobacion() === 'pendientes') {
      usuariosFiltrados = usuariosFiltrados.filter(u => u.role === 'especialista' && !u.aprobado);
    } else if (this.filtroAprobacion() === 'aprobados') {
      usuariosFiltrados = usuariosFiltrados.filter(u => u.role === 'especialista' && u.aprobado);
    }

    return usuariosFiltrados;
  }

  getEspecialistasPendientes(): Usuario[] {
    return this.usuarios().filter(u => u.role === 'especialista' && !u.aprobado);
  }

  toggleFormulario(): void {
    this.mostrarFormulario.set(!this.mostrarFormulario());
  }

  onUsuarioCreado(): void {
    this.mostrarFormulario.set(false);
    this.cargarUsuarios();
  }

  async descargarUsuariosExcel(): Promise<void> {
    try {
      const usuarios = this.usuarios();
      if (!usuarios.length) {
        await this.notificationService.showInfo(
          'Sin datos',
          'No hay usuarios disponibles para exportar.'
        );
        return;
      }

      await this.reportService.exportarUsuariosExcel(usuarios);
      await this.notificationService.showSuccess(
        'Descarga iniciada',
        'El Excel con todos los usuarios se generó correctamente.'
      );
    } catch (error) {
      console.error('Error exportando usuarios:', error);
      await this.notificationService.showError(
        'Error',
        'No pudimos generar el Excel de usuarios. Intenta nuevamente.'
      );
    }
  }

  async descargarHistorialPaciente(usuario: Usuario): Promise<void> {
    if (usuario.role !== 'paciente') {
      return;
    }

    try {
      this.loadingService.show();
      const turnos = await firstValueFrom(this.turnoService.getTurnosPorPaciente(usuario.uid));
      this.loadingService.hide();

      if (!turnos.length) {
        await this.notificationService.showInfo(
          'Sin turnos registrados',
          'El paciente seleccionado todavía no tiene turnos para exportar.'
        );
        return;
      }

      await this.reportService.exportarTurnosPacienteExcel(turnos);
      await this.notificationService.showSuccess(
        'Descarga iniciada',
        `Se generó el Excel con los turnos de ${usuario.nombre} ${usuario.apellido}.`
      );
    } catch (error) {
      console.error('Error exportando turnos del paciente:', error);
      this.loadingService.hide();
      await this.notificationService.showError(
        'Error',
        'Ocurrió un problema al generar el Excel del paciente. Intenta nuevamente.'
      );
    }
  }
}
