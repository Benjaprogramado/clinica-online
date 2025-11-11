import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { TurnoService } from '../../../core/services/turno';
import { Turno, EstadoTurno, FiltroTurnos } from '../../../core/models/turno.model';
import { LoadingService } from '../../../core/services/loading';
import { NotificationService } from '../../../core/services/notification';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-turnos-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turnos.html',
  styleUrl: './turnos.scss'
})
export class TurnosAdminComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private turnoService = inject(TurnoService);
  private loadingService = inject(LoadingService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  turnos = signal<Turno[]>([]);
  private turnosSub?: Subscription;
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
        t.especialistaNombre.toLowerCase().includes(texto) ||
        t.especialistaApellido.toLowerCase().includes(texto) ||
        t.pacienteDNI.includes(texto)
      );
    }

    if (this.filtros().fechaDesde) {
      resultado = resultado.filter(t => 
        new Date(t.fecha) >= new Date(this.filtros().fechaDesde!)
      );
    }

    if (this.filtros().fechaHasta) {
      const fechaHasta = new Date(this.filtros().fechaHasta!);
      fechaHasta.setHours(23, 59, 59, 999);
      resultado = resultado.filter(t => 
        new Date(t.fecha) <= fechaHasta
      );
    }

    return resultado;
  });

  filtros = signal<FiltroTurnos>({
    estado: 'todos',
    especialidad: '',
    textoBusqueda: '',
    fechaDesde: undefined,
    fechaHasta: undefined
  });

  estados: EstadoTurno[] = ['pendiente', 'aceptado', 'rechazado', 'cancelado', 'realizado', 'resena-pendiente'];

  ngOnInit() {
    this.cargarTurnos();
  }

  ngOnDestroy() {
    this.turnosSub?.unsubscribe();
  }
  cargarTurnos() {
    this.loadingService.show();
    this.turnosSub?.unsubscribe();
    this.turnosSub = this.turnoService.getAllTurnos().subscribe({
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

  aplicarFiltroFechaDesde(fecha: string) {
    this.filtros.update(f => ({ ...f, fechaDesde: fecha ? new Date(fecha) : undefined }));
  }

  aplicarFiltroFechaHasta(fecha: string) {
    this.filtros.update(f => ({ ...f, fechaHasta: fecha ? new Date(fecha) : undefined }));
  }

  limpiarFiltros() {
    this.filtros.set({
      estado: 'todos',
      especialidad: '',
      textoBusqueda: '',
      fechaDesde: undefined,
      fechaHasta: undefined
    });
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

  formatearFechaParaInput(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  irASolicitarTurno() {
    this.router.navigate(['/admin/solicitar-turno']);
  }

  async cancelarTurno(turno: Turno) {
    if (turno.estado !== 'pendiente') {
      return;
    }

    const comentario = await this.notificationService.promptTextarea(
      'Cancelar turno',
      `Ingresa el motivo de cancelación del turno de ${turno.pacienteNombre} ${turno.pacienteApellido} con ${turno.especialistaNombre} ${turno.especialistaApellido}.`,
      'Motivo de cancelación',
      'Cancelar turno'
    );

    if (!comentario) {
      return;
    }

    this.loadingService.show();
    try {
      await this.turnoService.cancelarTurno(turno.id, comentario);
      this.loadingService.hide();
      await this.notificationService.showSuccess(
        'Turno cancelado',
        'El turno pendiente fue cancelado correctamente.'
      );
    } catch (error) {
      this.loadingService.hide();
      // El servicio ya muestra la notificación de error
    }
  }
}
