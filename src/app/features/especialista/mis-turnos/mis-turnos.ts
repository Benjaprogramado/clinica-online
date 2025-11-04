import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { TurnoService } from '../../../core/services/turno';
import { Turno, EstadoTurno, FiltroTurnos } from '../../../core/models/turno.model';
import { LoadingService } from '../../../core/services/loading';
import { NotificationService } from '../../../core/services/notification';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mis-turnos-especialista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mis-turnos.html',
  styleUrl: './mis-turnos.scss'
})
export class MisTurnosEspecialistaComponent implements OnInit {
  private authService = inject(AuthService);
  private turnoService = inject(TurnoService);
  private loadingService = inject(LoadingService);
  private notificationService = inject(NotificationService);

  turnos = signal<Turno[]>([]);
  turnosFiltrados = computed(() => {
    let resultado = [...this.turnos()];

    if (this.filtros().estado && this.filtros().estado !== 'todos') {
      resultado = resultado.filter(t => t.estado === this.filtros().estado);
    }

    if (this.filtros().especialidad) {
      resultado = resultado.filter(t => 
        t.especialidad.toLowerCase().includes(this.filtros().especialidad!.toLowerCase())
      );
    }

    if (this.filtros().textoBusqueda) {
      const texto = this.filtros().textoBusqueda!.toLowerCase();
      resultado = resultado.filter(t =>
        t.pacienteNombre.toLowerCase().includes(texto) ||
        t.pacienteApellido.toLowerCase().includes(texto) ||
        t.pacienteDNI.includes(texto)
      );
    }

    return resultado;
  });

  filtros = signal<FiltroTurnos>({
    estado: 'todos',
    especialidad: '',
    textoBusqueda: ''
  });

  estados: EstadoTurno[] = ['pendiente', 'aceptado', 'rechazado', 'cancelado', 'realizado', 'resena-pendiente'];

  ngOnInit() {
    this.cargarTurnos();
  }

  cargarTurnos() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.loadingService.show();
    this.turnoService.getTurnosPorEspecialista(currentUser.uid).subscribe({
      next: (turnos) => {
        this.turnos.set(turnos);
        this.loadingService.hide();
      },
      error: () => this.loadingService.hide()
    });
  }

  aplicarFiltroEstado(estado: EstadoTurno | 'todos') {
    this.filtros.update(f => ({ ...f, estado }));
  }

  aplicarFiltroEspecialidad(especialidad: string) {
    this.filtros.update(f => ({ ...f, especialidad }));
  }

  aplicarFiltroBusqueda(texto: string) {
    this.filtros.update(f => ({ ...f, textoBusqueda: texto }));
  }

  limpiarFiltros() {
    this.filtros.set({
      estado: 'todos',
      especialidad: '',
      textoBusqueda: ''
    });
  }

  async aceptarTurno(turno: Turno) {
    const { value: comentario } = await Swal.fire({
      title: 'Aceptar turno',
      input: 'textarea',
      inputLabel: 'Comentario (opcional)',
      inputPlaceholder: 'Agrega un comentario para el paciente...',
      inputAttributes: {
        'aria-label': 'Comentario opcional',
        'style': 'color: #212529 !important; background-color: #ffffff !important; font-weight: 500 !important; border: 2px solid #00adb5 !important;'
      },
      inputValue: '',
      showCancelButton: true,
      confirmButtonColor: '#00adb5',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'swal-dark-popup',
        title: 'swal-dark-title',
        inputLabel: 'swal-dark-label',
        input: 'swal-dark-input',
        htmlContainer: 'swal-dark-container'
      }
    });

    if (comentario !== undefined) {
      this.loadingService.show();
      try {
        await this.turnoService.aceptarTurno(turno.id, comentario || '');
        
        // Ocultar loading antes de recargar turnos
        this.loadingService.hide();
        
        // Recargar turnos
        await this.cargarTurnosAsync();
        
        // Mostrar notificación de éxito después de recargar
        await this.notificationService.showSuccess(
          'Turno aceptado',
          'El turno ha sido aceptado correctamente.'
        );
      } catch (error) {
        // Error manejado por el servicio
        this.loadingService.hide();
      }
    }
  }

  async rechazarTurno(turno: Turno) {
    const { value: comentario } = await Swal.fire({
      title: 'Rechazar turno',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo (requerido)',
      inputPlaceholder: 'Explica por qué rechazas el turno...',
      inputAttributes: {
        'aria-label': 'Motivo del rechazo',
        'style': 'color: #212529 !important; background-color: #ffffff !important; font-weight: 500 !important; border: 2px solid #00adb5 !important;'
      },
      inputValue: '',
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) {
          return 'Debes proporcionar un motivo de al menos 5 caracteres';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'swal-dark-popup',
        title: 'swal-dark-title',
        inputLabel: 'swal-dark-label',
        input: 'swal-dark-input',
        htmlContainer: 'swal-dark-container'
      }
    });

    if (comentario) {
      this.loadingService.show();
      try {
        await this.turnoService.rechazarTurno(turno.id, comentario);
        
        // Ocultar loading antes de recargar turnos
        this.loadingService.hide();
        
        // Recargar turnos
        await this.cargarTurnosAsync();
        
        // Mostrar notificación de éxito después de recargar
        await this.notificationService.showSuccess(
          'Turno rechazado',
          'El turno ha sido rechazado correctamente.'
        );
      } catch (error) {
        // Error manejado por el servicio
        this.loadingService.hide();
      }
    }
  }

  private async cargarTurnosAsync(): Promise<void> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    return new Promise((resolve, reject) => {
      this.turnoService.getTurnosPorEspecialista(currentUser.uid).subscribe({
        next: (turnos) => {
          this.turnos.set(turnos);
          resolve();
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }

  async cancelarTurno(turno: Turno) {
    const resultado = await Swal.fire({
      title: '¿Cancelar turno?',
      text: `¿Estás seguro de cancelar el turno del ${new Date(turno.fecha).toLocaleDateString()} a las ${turno.hora}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00adb5',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No'
    });

    if (resultado.isConfirmed) {
      this.loadingService.show();
      try {
        await this.turnoService.cancelarTurno(turno.id, 'Cancelado por el especialista');
        
        // Ocultar loading antes de recargar turnos
        this.loadingService.hide();
        
        // Recargar turnos
        await this.cargarTurnosAsync();
        
        // Mostrar notificación de éxito después de recargar
        await this.notificationService.showSuccess(
          'Turno cancelado',
          'El turno ha sido cancelado correctamente.'
        );
      } catch (error) {
        // Error manejado por el servicio
        this.loadingService.hide();
      }
    }
  }

  async finalizarTurno(turno: Turno) {
    const resultado = await Swal.fire({
      title: '¿Finalizar turno?',
      text: 'Una vez finalizado, el paciente podrá dejar una reseña.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#00adb5',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar'
    });

    if (resultado.isConfirmed) {
      this.loadingService.show();
      try {
        await this.turnoService.finalizarTurno(turno.id);
        
        // Ocultar loading antes de recargar turnos
        this.loadingService.hide();
        
        // Recargar turnos
        await this.cargarTurnosAsync();
        
        // Mostrar notificación de éxito después de recargar
        await this.notificationService.showSuccess(
          'Turno finalizado',
          'El turno ha sido finalizado. El paciente podrá dejar una reseña.'
        );
      } catch (error) {
        // Error manejado por el servicio
        this.loadingService.hide();
      }
    }
  }

  obtenerColorEstado(estado: EstadoTurno): string {
    const colores: { [key: string]: string } = {
      'pendiente': 'warning',
      'aceptado': 'info',
      'rechazado': 'danger',
      'cancelado': 'secondary',
      'realizado': 'success',
      'resena-pendiente': 'primary'
    };
    return colores[estado] || 'secondary';
  }

  obtenerTextoEstado(estado: EstadoTurno): string {
    const textos: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'aceptado': 'Aceptado',
      'rechazado': 'Rechazado',
      'cancelado': 'Cancelado',
      'realizado': 'Realizado',
      'resena-pendiente': 'Pendiente de reseña'
    };
    return textos[estado] || estado;
  }
}
