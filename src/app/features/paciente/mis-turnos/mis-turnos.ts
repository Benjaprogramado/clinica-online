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
  selector: 'app-mis-turnos-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mis-turnos.html',
  styleUrl: './mis-turnos.scss'
})
export class MisTurnosPacienteComponent implements OnInit {
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
        t.especialistaNombre.toLowerCase().includes(texto) ||
        t.especialistaApellido.toLowerCase().includes(texto) ||
        t.especialidad.toLowerCase().includes(texto)
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
    this.turnoService.getTurnosPorPaciente(currentUser.uid).subscribe({
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
        await this.turnoService.cancelarTurno(turno.id, 'Cancelado por el paciente');
        this.cargarTurnos();
      } catch (error) {
        // Error manejado por el servicio
      } finally {
        this.loadingService.hide();
      }
    }
  }

  async calificarTurno(turno: Turno) {
    const { value: resultado } = await Swal.fire({
      title: 'Calificar atención',
      html: `
        <div class="mb-3">
          <label>Calificación (1-5 estrellas)</label>
          <select id="calificacion" class="form-control">
            <option value="1">1 - Muy mala</option>
            <option value="2">2 - Mala</option>
            <option value="3">3 - Regular</option>
            <option value="4">4 - Buena</option>
            <option value="5" selected>5 - Excelente</option>
          </select>
        </div>
        <div>
          <label>Comentario</label>
          <textarea id="comentario" class="form-control" rows="3" placeholder="Describe tu experiencia..."></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#00adb5',
      preConfirm: () => {
        const calificacion = (document.getElementById('calificacion') as HTMLSelectElement).value;
        const comentario = (document.getElementById('comentario') as HTMLTextAreaElement).value;

        if (!comentario || comentario.trim().length < 10) {
          Swal.showValidationMessage('El comentario debe tener al menos 10 caracteres');
        }

        return {
          calificacion: Number(calificacion),
          comentario: comentario.trim()
        };
      }
    });

    if (resultado) {
      this.loadingService.show();
      try {
        await this.turnoService.guardarResena(
          turno.id,
          resultado.calificacion,
          resultado.comentario
        );
        this.cargarTurnos();
      } catch (error) {
        // Error manejado por el servicio
      } finally {
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
