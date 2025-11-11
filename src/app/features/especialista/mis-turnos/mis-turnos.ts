import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { TurnoService } from '../../../core/services/turno';
import { Turno, EstadoTurno, FiltroTurnos, HistoriaClinicaPayload } from '../../../core/models/turno.model';
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
        t.pacienteDNI.includes(texto) ||
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
      let exito = false;
      try {
        await this.turnoService.aceptarTurno(turno.id, comentario || '');
        await this.cargarTurnosAsync();
        exito = true;
      } catch (error) {
        // Error manejado por el servicio
      } finally {
        this.loadingService.hide();
      }

      if (exito) {
        await this.notificationService.showSuccess(
          'Turno aceptado',
          'El turno ha sido aceptado correctamente.'
        );
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
      let exito = false;
      try {
        await this.turnoService.rechazarTurno(turno.id, comentario);
        await this.cargarTurnosAsync();
        exito = true;
      } catch (error) {
        // Error manejado por el servicio
      } finally {
        this.loadingService.hide();
      }

      if (exito) {
        await this.notificationService.showSuccess(
          'Turno rechazado',
          'El turno ha sido rechazado correctamente.'
        );
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
      let exito = false;
      try {
        await this.turnoService.cancelarTurno(turno.id, 'Cancelado por el especialista');
        await this.cargarTurnosAsync();
        exito = true;
      } catch (error) {
        // Error manejado por el servicio
      } finally {
        this.loadingService.hide();
      }

      if (exito) {
        await this.notificationService.showSuccess(
          'Turno cancelado',
          'El turno ha sido cancelado correctamente.'
        );
      }
    }
  }

  async finalizarTurno(turno: Turno) {
    const { value: historiaClinica } = await Swal.fire<HistoriaClinicaPayload>({
      title: 'Registrar historia clínica',
      html: this.crearFormularioHistoriaClinica(turno),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar historia',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#00adb5',
      cancelButtonColor: '#6c757d',
      customClass: {
        popup: 'swal-dark-popup',
        title: 'swal-dark-title',
        htmlContainer: 'swal-dark-container'
      },
      preConfirm: () => this.obtenerHistoriaDesdeFormulario()
    });

    if (!historiaClinica) {
      return;
    }

    this.loadingService.show();
    let exito = false;
    try {
      await this.turnoService.registrarHistoriaClinica(turno.id, historiaClinica);
      await this.cargarTurnosAsync();
      exito = true;
    } catch (error) {
      // El servicio ya maneja la notificación de error
    } finally {
      this.loadingService.hide();
    }

    if (exito) {
      await this.notificationService.showSuccess(
        'Historia clínica registrada',
        'La historia clínica se guardó correctamente y el turno quedó pendiente de reseña.'
      );
    }
  }

  async verHistoriaClinica(turno: Turno) {
    if (!turno.historiaClinica) {
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
      title: 'Historia clínica registrada',
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
      icon: 'info',
      confirmButtonColor: '#00adb5'
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

  private crearFormularioHistoriaClinica(turno: Turno): string {
    const extras = turno.historiaClinica?.datosDinamicos || [];

    return `
      <div class="historia-formulario">
        <p class="descripcion">
          Completa los datos de la atención del paciente ${turno.pacienteNombre} ${turno.pacienteApellido}.
        </p>
        <div class="historia-grid">
          <div class="campo">
            <label for="historia-altura">Altura (cm)</label>
            <input id="historia-altura" type="number" min="0" step="0.1" value="${turno.historiaClinica?.altura ?? ''}" />
          </div>
          <div class="campo">
            <label for="historia-peso">Peso (kg)</label>
            <input id="historia-peso" type="number" min="0" step="0.1" value="${turno.historiaClinica?.peso ?? ''}" />
          </div>
          <div class="campo">
            <label for="historia-temperatura">Temperatura (°C)</label>
            <input id="historia-temperatura" type="number" min="0" step="0.1" value="${turno.historiaClinica?.temperatura ?? ''}" />
          </div>
          <div class="campo">
            <label for="historia-presion">Presión</label>
            <input id="historia-presion" type="text" placeholder="Ej: 120/80" value="${turno.historiaClinica?.presion ?? ''}" />
          </div>
        </div>
        <div class="campo">
          <label for="historia-diagnostico">Diagnóstico / Comentarios</label>
          <textarea id="historia-diagnostico" rows="3" placeholder="Describe el diagnóstico o comentarios relevantes...">${turno.historiaClinica?.comentarioDiagnostico ?? ''}</textarea>
        </div>
        <div class="datos-dinamicos">
          <label>Datos adicionales (opcional, máximo 3)</label>
          ${[1, 2, 3].map(index => `
            <div class="dato-dinamico">
              <input id="historia-extra-clave-${index}" type="text" placeholder="Clave" value="${extras[index - 1]?.clave || ''}"/>
              <input id="historia-extra-valor-${index}" type="text" placeholder="Valor" value="${extras[index - 1]?.valor || ''}"/>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private obtenerHistoriaDesdeFormulario(): HistoriaClinicaPayload | false {
    const altura = Number((document.getElementById('historia-altura') as HTMLInputElement)?.value);
    const peso = Number((document.getElementById('historia-peso') as HTMLInputElement)?.value);
    const temperatura = Number((document.getElementById('historia-temperatura') as HTMLInputElement)?.value);
    const presion = (document.getElementById('historia-presion') as HTMLInputElement)?.value?.trim();
    const comentarioDiagnostico = (document.getElementById('historia-diagnostico') as HTMLTextAreaElement)?.value?.trim();

    if (!altura || altura <= 0) {
      Swal.showValidationMessage('Debes ingresar la altura del paciente en centímetros.');
      return false;
    }

    if (!peso || peso <= 0) {
      Swal.showValidationMessage('Debes ingresar el peso del paciente en kilogramos.');
      return false;
    }

    if (!temperatura || temperatura <= 0) {
      Swal.showValidationMessage('Debes ingresar la temperatura del paciente.');
      return false;
    }

    if (!presion) {
      Swal.showValidationMessage('Debes ingresar la presión arterial del paciente.');
      return false;
    }

    const datosDinamicos: { clave: string; valor: string }[] = [];
    let datosValidos = true;

    [1, 2, 3].forEach(index => {
      const clave = (document.getElementById(`historia-extra-clave-${index}`) as HTMLInputElement)?.value?.trim();
      const valor = (document.getElementById(`historia-extra-valor-${index}`) as HTMLInputElement)?.value?.trim();

      if ((clave && !valor) || (!clave && valor)) {
        datosValidos = false;
        Swal.showValidationMessage('Cada dato adicional debe tener una clave y un valor.');
      }

      if (clave && valor) {
        datosDinamicos.push({ clave, valor });
      }
    });

    if (!datosValidos) {
      return false;
    }

    return {
      altura,
      peso,
      temperatura,
      presion,
      comentarioDiagnostico: comentarioDiagnostico || undefined,
      datosDinamicos
    };
  }
}
