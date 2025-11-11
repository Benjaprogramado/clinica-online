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
        t.especialidad.toLowerCase().includes(texto) ||
        t.historiaClinica?.comentarioDiagnostico?.toLowerCase().includes(texto) ||
        `${t.historiaClinica?.altura ?? ''}`.toLowerCase().includes(texto) ||
        `${t.historiaClinica?.peso ?? ''}`.toLowerCase().includes(texto) ||
        `${t.historiaClinica?.temperatura ?? ''}`.toLowerCase().includes(texto) ||
        t.historiaClinica?.presion?.toLowerCase().includes(texto) ||
        !!t.historiaClinica?.datosDinamicos?.some(dato =>
          `${dato.clave} ${dato.valor}`.toLowerCase().includes(texto)
        )
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
        console.log('Turnos cargados:', turnos);
        this.turnos.set(turnos);
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Error al cargar turnos:', err);
        this.loadingService.hide();
      }
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
    if (turno.estado !== 'pendiente') {
      return;
    }

    const comentario = await this.notificationService.promptTextarea(
      'Cancelar turno',
      `Ingresa el motivo de cancelación del turno con ${turno.especialistaNombre} ${turno.especialistaApellido} el ${new Date(turno.fecha).toLocaleDateString()} a las ${turno.hora}.`,
      'Motivo de cancelación',
      'Cancelar turno'
    );

    if (!comentario) {
      return;
    }

    this.loadingService.show();
    try {
      await this.turnoService.cancelarTurno(turno.id, comentario);
      
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

  private async cargarTurnosAsync(): Promise<void> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    return new Promise((resolve, reject) => {
      this.turnoService.getTurnosPorPaciente(currentUser.uid).subscribe({
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

  async calificarTurno(turno: Turno) {
    const { value: resultado } = await Swal.fire({
      title: 'Calificar atención',
      html: `
        <div class="mb-3">
          <label style="color: #333 !important; font-weight: 600 !important; display: block; margin-bottom: 0.5rem;">Calificación (1-5 estrellas)</label>
          <select id="calificacion" class="form-control swal-input-select" style="color: #212529 !important; background-color: #ffffff !important; border: 2px solid #00adb5 !important; font-weight: 500 !important;">
            <option value="1">1 - Muy mala</option>
            <option value="2">2 - Mala</option>
            <option value="3">3 - Regular</option>
            <option value="4">4 - Buena</option>
            <option value="5" selected>5 - Excelente</option>
          </select>
        </div>
        <div>
          <label style="color: #333 !important; font-weight: 600 !important; display: block; margin-bottom: 0.5rem;">Comentario</label>
          <textarea id="comentario" class="form-control swal-input-textarea" rows="3" placeholder="Describe tu experiencia..." style="color: #212529 !important; background-color: #ffffff !important; border: 2px solid #00adb5 !important; font-weight: 500 !important;"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#00adb5',
      cancelButtonColor: '#6c757d',
      customClass: {
        popup: 'swal-dark-popup',
        title: 'swal-dark-title',
        htmlContainer: 'swal-dark-container'
      },
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
        
        // Ocultar loading antes de recargar turnos
        this.loadingService.hide();
        
        // Recargar turnos
        await this.cargarTurnosAsync();
        
        // Mostrar notificación de éxito después de recargar
        await this.notificationService.showSuccess(
          'Reseña guardada',
          'Gracias por tu feedback. Tu reseña ha sido guardada correctamente.'
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

  async verHistoriaClinica(turno: Turno) {
    if (!turno.historiaClinica) {
      await this.notificationService.showInfo(
        'Sin historia clínica',
        'Aún no se registró la historia clínica para este turno.'
      );
      return;
    }

    const historia = turno.historiaClinica;
    const datosExtra = historia.datosDinamicos?.length
      ? `<ul class="historia-extra-list">
          ${historia.datosDinamicos
            .map(dato => `<li><strong>${dato.clave}:</strong> ${dato.valor}</li>`)
            .join('')}
        </ul>`
      : '<p class="historia-extra-vacio">Sin datos adicionales.</p>';

    await Swal.fire({
      title: 'Historia clínica de la atención',
      html: `
        <div class="historia-clinica-detalle">
          <p><strong>Especialidad:</strong> ${historia.especialidad}</p>
          <p><strong>Profesional:</strong> ${historia.especialistaNombre} ${historia.especialistaApellido}</p>
          <p><strong>Fecha:</strong> ${new Date(historia.fechaAtencion).toLocaleString('es-AR')}</p>
          <p><strong>Altura:</strong> ${historia.altura} cm</p>
          <p><strong>Peso:</strong> ${historia.peso} kg</p>
          <p><strong>Temperatura:</strong> ${historia.temperatura} °C</p>
          <p><strong>Presión:</strong> ${historia.presion}</p>
          <p><strong>Diagnóstico / Comentario:</strong> ${historia.comentarioDiagnostico || '—'}</p>
          <div>
            <strong>Datos adicionales:</strong>
            ${datosExtra}
          </div>
        </div>
      `,
      confirmButtonColor: '#00adb5'
    });
  }
}
