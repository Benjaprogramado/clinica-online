import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { TurnoService } from '../../../core/services/turno';
import { ReportService } from '../../../core/services/report';
import { NotificationService } from '../../../core/services/notification';
import { LoadingService } from '../../../core/services/loading';
import { Usuario } from '../../../core/models/user.model';
import { HistoriaClinica } from '../../../core/models/turno.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mi-perfil-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.scss'
})
export class MiPerfilPacienteComponent implements OnInit {
  private authService = inject(AuthService);
  private turnoService = inject(TurnoService);
  private reportService = inject(ReportService);
  private notificationService = inject(NotificationService);
  private loadingService = inject(LoadingService);

  usuario = signal<Usuario | null>(null);
  historiasClinicas = signal<HistoriaClinica[]>([]);
  especialidadSeleccionada = signal<'todas' | string>('todas');

  especialidadesDisponibles = computed(() => {
    const historias = this.historiasClinicas();
    const especialidades = new Set<string>();
    historias.forEach(historia => especialidades.add(historia.especialidad));
    return Array.from(especialidades).sort();
  });

  historiasFiltradas = computed(() => {
    const especialidad = this.especialidadSeleccionada();
    if (especialidad === 'todas') {
      return this.historiasClinicas().sort((a, b) =>
        (b.fechaAtencionTimestamp?.seconds || 0) - (a.fechaAtencionTimestamp?.seconds || 0)
      );
    }

    return this.historiasClinicas()
      .filter(historia => historia.especialidad === especialidad)
      .sort((a, b) =>
        (b.fechaAtencionTimestamp?.seconds || 0) - (a.fechaAtencionTimestamp?.seconds || 0)
      );
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    const usuarioActual = this.authService.currentUser();
    if (!usuarioActual) {
      return;
    }

    const usuarioNormalizado: Usuario = {
      ...usuarioActual,
      ultimoIngreso: this.normalizarFecha(usuarioActual.ultimoIngreso) ?? undefined
    };

    this.usuario.set(usuarioNormalizado);
    this.loadingService.show();
    this.turnoService.getHistoriasClinicasPorPaciente(usuarioActual.uid).subscribe({
      next: historias => {
        this.historiasClinicas.set(historias);
        this.loadingService.hide();
      },
      error: err => {
        console.error('Error cargando historias clínicas:', err);
        this.loadingService.hide();
        this.notificationService.showError(
          'Error',
          'No pudimos obtener tu historia clínica. Intenta nuevamente.'
        );
      }
    });
  }

  async descargarPdf(): Promise<void> {
    const usuario = this.usuario();
    const historias = this.historiasFiltradas();

    if (!usuario) {
      return;
    }

    if (!historias || historias.length === 0) {
      await this.notificationService.showInfo(
        'Sin registros',
        'No hay historias clínicas para la especialidad seleccionada.'
      );
      return;
    }

    try {
      await this.reportService.exportarHistoriaClinicaPdf({
        pacienteNombre: usuario.nombre,
        pacienteApellido: usuario.apellido,
        pacienteDni: usuario.dni,
        especialidadSeleccionada: this.especialidadSeleccionada() === 'todas'
          ? undefined
          : this.especialidadSeleccionada(),
        historias
      });
      await this.notificationService.showSuccess(
        'Descarga iniciada',
        'Tu informe PDF se generó correctamente.'
      );
    } catch (error) {
      console.error('Error al generar PDF:', error);
      await this.notificationService.showError(
        'Error',
        'Ocurrió un problema al generar el PDF. Intenta nuevamente.'
      );
    }
  }

  verDetalle(historia: HistoriaClinica): void {
    const datosExtra = historia.datosDinamicos?.length
      ? `<ul class="historia-extra-list">
          ${historia.datosDinamicos
            .map(dato => `<li><strong>${dato.clave}:</strong> ${dato.valor}</li>`)
            .join('')}
        </ul>`
      : '<p class="historia-extra-vacio">Sin datos adicionales.</p>';

    Swal.fire({
      title: `Atención ${new Date(historia.fechaAtencion).toLocaleDateString('es-AR')}`,
      html: `
        <div class="historia-clinica-detalle">
          <p><strong>Profesional:</strong> ${historia.especialistaNombre} ${historia.especialistaApellido}</p>
          <p><strong>Especialidad:</strong> ${historia.especialidad}</p>
          <p><strong>Altura:</strong> ${historia.altura} cm</p>
          <p><strong>Peso:</strong> ${historia.peso} kg</p>
          <p><strong>Temperatura:</strong> ${historia.temperatura} °C</p>
          <p><strong>Presión:</strong> ${historia.presion}</p>
          <p><strong>Diagnóstico / Comentarios:</strong> ${historia.comentarioDiagnostico || '—'}</p>
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
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearHora(fecha: Date): string {
    return new Date(fecha).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  cambiarEspecialidad(valor: 'todas' | string): void {
    this.especialidadSeleccionada.set(valor);
  }

  private normalizarFecha(valor: unknown): Date | undefined {
    if (!valor) {
      return undefined;
    }

    if (valor instanceof Date) {
      return valor;
    }

    if (typeof valor === 'number') {
      return new Date(valor);
    }

    if (typeof valor === 'string') {
      const fechaParseada = new Date(valor);
      return isNaN(fechaParseada.getTime()) ? undefined : fechaParseada;
    }

    if (typeof (valor as { toDate?: () => Date }).toDate === 'function') {
      return (valor as { toDate: () => Date }).toDate();
    }

    const posibleTimestamp = valor as { seconds?: number; nanoseconds?: number };
    if (typeof posibleTimestamp?.seconds === 'number') {
      const milisegundos =
        posibleTimestamp.seconds * 1000 + Math.floor((posibleTimestamp.nanoseconds ?? 0) / 1_000_000);
      return new Date(milisegundos);
    }

    return undefined;
  }
}
