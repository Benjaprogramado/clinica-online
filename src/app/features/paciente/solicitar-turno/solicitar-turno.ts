import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { TurnoService } from '../../../core/services/turno';
import { DisponibilidadService } from '../../../core/services/disponibilidad';
import { EspecialidadesService } from '../../../core/services/especialidades';
import { UserService } from '../../../core/services/user';
import { Usuario } from '../../../core/models/user.model';
import { DisponibilidadEspecialista } from '../../../core/models/turno.model';
import { LoadingService } from '../../../core/services/loading';
import { NotificationService } from '../../../core/services/notification';
import { RecaptchaComponent } from '../../../shared/components/recaptcha/recaptcha';
import { EspecialidadImagenPipe } from '../../../shared/pipes/especialidad-imagen.pipe';

interface TurnoDisponible {
  fecha: Date;
  hora: string;
  fechaHoraStr: string; // Formato: "2021-09-09 1:15 PM"
}

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, RecaptchaComponent, EspecialidadImagenPipe],
  templateUrl: './solicitar-turno.html',
  styleUrl: './solicitar-turno.scss'
})
export class SolicitarTurnoComponent implements OnInit {
  private fb = inject(FormBuilder);
  router = inject(Router);
  private authService = inject(AuthService);
  private turnoService = inject(TurnoService);
  private disponibilidadService = inject(DisponibilidadService);
  private especialidadesService = inject(EspecialidadesService);
  private userService = inject(UserService);
  private loadingService = inject(LoadingService);
  private notificationService = inject(NotificationService);

  formulario: FormGroup;
  especialistas = signal<Usuario[]>([]);
  especialidadesDelEspecialista = signal<string[]>([]);
  disponibilidades = signal<DisponibilidadEspecialista[]>([]);
  turnosDisponibles = signal<TurnoDisponible[]>([]);
  
  especialistaSeleccionado = signal<Usuario | null>(null);
  captchaValidado = signal<boolean>(false);

  constructor() {
    this.formulario = this.fb.group({
      especialista: ['', Validators.required],
      especialidad: ['', Validators.required],
      fechaHora: ['', Validators.required],
      comentario: ['']
    });
  }

  async ngOnInit() {
    this.loadingService.show();
    
    try {
      // Cargar todos los especialistas aprobados
      this.userService.getUsuariosPorRol('especialista').subscribe({
        next: (usuarios) => {
          const especialistasAprobados = usuarios.filter(u => u.aprobado === true);
          this.especialistas.set(especialistasAprobados);
          this.loadingService.hide();
        },
        error: () => this.loadingService.hide()
      });
    } catch (error) {
      this.loadingService.hide();
    }
  }

  onEspecialistaSeleccionado() {
    const especialistaId = this.formulario.get('especialista')?.value;
    if (!especialistaId) {
      this.especialistaSeleccionado.set(null);
      this.especialidadesDelEspecialista.set([]);
      this.formulario.patchValue({ especialidad: '', fechaHora: '' });
      return;
    }

    const especialista = this.especialistas().find(e => e.uid === especialistaId);
    this.especialistaSeleccionado.set(especialista || null);

    // Obtener especialidades del especialista seleccionado
    if (especialista && especialista.especialidades && Array.isArray(especialista.especialidades)) {
      this.especialidadesDelEspecialista.set(especialista.especialidades);
    } else {
      this.especialidadesDelEspecialista.set([]);
    }

    this.formulario.patchValue({ especialidad: '', fechaHora: '' });
    this.turnosDisponibles.set([]);
  }

  onEspecialidadSeleccionada() {
    const especialidad = this.formulario.get('especialidad')?.value;
    const especialistaId = this.formulario.get('especialista')?.value;
    
    if (!especialidad || !especialistaId) {
      this.turnosDisponibles.set([]);
      this.formulario.patchValue({ fechaHora: '' });
      return;
    }

    // Cargar disponibilidades y generar turnos disponibles
    this.loadingService.show();
    this.disponibilidadService
      .getDisponibilidadPorEspecialistaYEspecialidad(especialistaId, especialidad)
      .subscribe({
        next: (disponibilidades) => {
          this.disponibilidades.set(disponibilidades);
          this.generarTurnosDisponibles(disponibilidades, especialistaId);
          this.formulario.patchValue({ fechaHora: '' });
          this.loadingService.hide();
        },
        error: (err) => {
          console.error('Error al cargar disponibilidades:', err);
          this.disponibilidades.set([]);
          this.turnosDisponibles.set([]);
          this.loadingService.hide();
        }
      });
  }

  generarTurnosDisponibles(disponibilidades: DisponibilidadEspecialista[], especialistaId: string) {
    if (!disponibilidades || disponibilidades.length === 0) {
      this.turnosDisponibles.set([]);
      return;
    }

    // Cargar turnos ocupados del especialista
    this.turnoService.getTurnosPorEspecialista(especialistaId).subscribe({
      next: (turnos) => {
        const turnosDisponibles: TurnoDisponible[] = [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Generar turnos para los próximos 15 días
        for (let i = 0; i < 15; i++) {
          const fecha = new Date(hoy);
          fecha.setDate(fecha.getDate() + i);
          const diaSemana = this.obtenerDiaSemana(fecha);

          // Buscar disponibilidades para este día
          const disponibilidadesDelDia = disponibilidades.filter(disp => 
            disp.dias && disp.dias.includes(diaSemana)
          );

          for (const disponibilidad of disponibilidadesDelDia) {
            // Obtener turnos ocupados para esta fecha
            const turnosOcupados = turnos
              .filter(t => {
                const fechaTurno = new Date(t.fecha);
                const fechaTurnoStr = fechaTurno.getFullYear() + '-' + 
                  String(fechaTurno.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(fechaTurno.getDate()).padStart(2, '0');
                const fechaStr = fecha.getFullYear() + '-' + 
                  String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(fecha.getDate()).padStart(2, '0');
                
                return (
                  fechaTurnoStr === fechaStr &&
                  (t.estado === 'aceptado' || t.estado === 'pendiente')
                );
              })
              .map(t => ({ hora: t.hora }));

            // Generar horarios disponibles para esta fecha y disponibilidad
            const horarios = this.disponibilidadService.generarHorariosDisponibles(
              disponibilidad,
              fecha,
              turnosOcupados
            );

            // Crear turnos disponibles combinando fecha y hora
            for (const hora of horarios) {
              const [horaNum, minutos] = hora.split(':').map(Number);
              const fechaCompleta = new Date(fecha);
              fechaCompleta.setHours(horaNum, minutos, 0, 0);

              turnosDisponibles.push({
                fecha: fechaCompleta,
                hora: hora,
                fechaHoraStr: this.formatearFechaHora(fechaCompleta)
              });
            }
          }
        }

        // Ordenar por fecha y hora ascendente
        turnosDisponibles.sort((a, b) => {
          const fechaA = a.fecha.getTime();
          const fechaB = b.fecha.getTime();
          return fechaA - fechaB;
        });

        this.turnosDisponibles.set(turnosDisponibles);
      },
      error: (err) => {
        console.error('Error al cargar turnos:', err);
        // Generar turnos sin filtrar turnos ocupados en caso de error
        this.generarTurnosDisponiblesSinFiltro(disponibilidades);
      }
    });
  }

  private generarTurnosDisponiblesSinFiltro(disponibilidades: DisponibilidadEspecialista[]) {
    const turnosDisponibles: TurnoDisponible[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = 0; i < 15; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      const diaSemana = this.obtenerDiaSemana(fecha);

      const disponibilidadesDelDia = disponibilidades.filter(disp => 
        disp.dias && disp.dias.includes(diaSemana)
      );

      for (const disponibilidad of disponibilidadesDelDia) {
        const horarios = this.disponibilidadService.generarHorariosDisponibles(
          disponibilidad,
          fecha,
          []
        );

        for (const hora of horarios) {
          const [horaNum, minutos] = hora.split(':').map(Number);
          const fechaCompleta = new Date(fecha);
          fechaCompleta.setHours(horaNum, minutos, 0, 0);

          turnosDisponibles.push({
            fecha: fechaCompleta,
            hora: hora,
            fechaHoraStr: this.formatearFechaHora(fechaCompleta)
          });
        }
      }
    }

    turnosDisponibles.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    this.turnosDisponibles.set(turnosDisponibles);
  }

  formatearFechaHora(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hora = fecha.getHours();
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    
    // Formato: "2021-09-09 1:15 PM"
    const hora12 = hora === 0 ? 12 : hora > 12 ? hora - 12 : hora;
    const amPm = hora < 12 ? 'AM' : 'PM';
    
    return `${year}-${month}-${day} ${hora12}:${minutos} ${amPm}`;
  }

  private obtenerDiaSemana(fecha: Date): 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' {
    const dias: ('lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado')[] = 
      ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const indice = fecha.getDay();
    return dias[indice === 0 ? 6 : indice - 1];
  }


  onCaptchaValidado(validado: boolean) {
    this.captchaValidado.set(validado);
  }

  async onSubmit() {
    if (this.formulario.invalid) {
      return;
    }

    if (!this.captchaValidado()) {
      await this.notificationService.showWarning(
        'reCAPTCHA no validado',
        'Debes completar correctamente la verificación de seguridad (reCAPTCHA) antes de solicitar el turno.'
      );
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return;
    }

    const valores = this.formulario.value;
    const especialista = this.especialistas().find(e => e.uid === valores.especialista);

    if (!especialista) {
      return;
    }

    // valores.fechaHora está en formato "YYYY-MM-DD HH:MM AM/PM"
    // Parsear fecha y hora desde el formato combinado
    const turnoSeleccionado = this.turnosDisponibles().find(t => t.fechaHoraStr === valores.fechaHora);
    
    if (!turnoSeleccionado) {
      await this.notificationService.showError(
        'Error',
        'El turno seleccionado no es válido.'
      );
      return;
    }

    const fechaCompleta = turnoSeleccionado.fecha;

    this.loadingService.show();
    try {
      await this.turnoService.crearTurno({
        pacienteId: currentUser.uid,
        pacienteNombre: currentUser.nombre,
        pacienteApellido: currentUser.apellido,
        pacienteDNI: currentUser.dni,
        pacienteEmail: currentUser.email,
        pacienteObraSocial: currentUser.obraSocial,
        especialistaId: especialista.uid,
        especialistaNombre: especialista.nombre,
        especialistaApellido: especialista.apellido,
        especialistaEmail: especialista.email,
        especialidad: valores.especialidad,
        fecha: fechaCompleta,
        hora: turnoSeleccionado.hora,
        estado: 'pendiente',
        comentarioPaciente: valores.comentario || ''
      });

      // Ocultar loading antes de mostrar la notificación y navegar
      this.loadingService.hide();
      
      // Mostrar notificación de éxito
      await this.notificationService.showSuccess(
        'Turno solicitado',
        'Tu turno ha sido solicitado correctamente. El especialista lo revisará pronto.'
      );

      // Navegar después de cerrar la notificación
      this.router.navigate(['/paciente/mis-turnos']);
    } catch (error) {
      // Error manejado por el servicio
      this.loadingService.hide();
    }
  }
}
