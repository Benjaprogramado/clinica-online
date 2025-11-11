import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TurnoService } from '../../../core/services/turno';
import { AuthService } from '../../../core/services/auth';
import { LoadingService } from '../../../core/services/loading';
import { NotificationService } from '../../../core/services/notification';
import { PacienteAtendidoPorEspecialista, Turno } from '../../../core/models/turno.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pacientes-atendidos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.scss'
})
export class PacientesAtendidosComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private notificationService = inject(NotificationService);

  pacientes = signal<PacienteAtendidoPorEspecialista[]>([]);
  filtroTexto = signal('');

  pacientesFiltrados = computed(() => {
    const texto = this.filtroTexto().toLowerCase().trim();
    if (!texto) {
      return this.pacientes();
    }

    return this.pacientes().filter(paciente => {
      const nombre = `${paciente.pacienteNombre} ${paciente.pacienteApellido}`.toLowerCase();
      const email = paciente.pacienteEmail?.toLowerCase() || '';
      const dni = paciente.pacienteDNI || '';
      const obraSocial = paciente.pacienteObraSocial?.toLowerCase() || '';
      return (
        nombre.includes(texto) ||
        email.includes(texto) ||
        dni.includes(texto) ||
        obraSocial.includes(texto)
      );
    });
  });

  ngOnInit(): void {
    this.cargarPacientes();
  }

  cargarPacientes(): void {
    const especialista = this.authService.currentUser();
    if (!especialista) {
      return;
    }

    this.loadingService.show();
    this.turnoService.getPacientesAtendidosPorEspecialista(especialista.uid).subscribe({
      next: pacientes => {
        this.pacientes.set(pacientes);
        this.loadingService.hide();
      },
      error: err => {
        console.error('Error cargando pacientes atendidos:', err);
        this.loadingService.hide();
        this.notificationService.showError(
          'Error',
          'No pudimos obtener la lista de pacientes atendidos. Intenta nuevamente.'
        );
      }
    });
  }

  onBuscar(texto: string): void {
    this.filtroTexto.set(texto);
  }

  verHistoria(turno: Turno): void {
    if (!turno.historiaClinica) {
      this.notificationService.showInfo(
        'Sin historia clínica',
        'Este turno todavía no tiene historia clínica registrada.'
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

    Swal.fire({
      title: 'Historia clínica',
      html: `
        <div class="historia-clinica-detalle">
          <p><strong>Fecha de atención:</strong> ${new Date(historia.fechaAtencion).toLocaleString('es-AR')}</p>
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

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-AR');
  }

  formatearHora(fecha: Date, hora: string): string {
    if (hora) {
      return hora;
    }
    return new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
}

