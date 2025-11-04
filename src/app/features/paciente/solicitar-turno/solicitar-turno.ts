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

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, RecaptchaComponent],
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
  especialidades = signal<string[]>([]);
  especialistas = signal<Usuario[]>([]);
  disponibilidades = signal<DisponibilidadEspecialista[]>([]);
  fechasDisponibles = signal<Date[]>([]);
  horariosDisponibles = signal<string[]>([]);
  
  especialistaSeleccionado = signal<Usuario | null>(null);
  fechaSeleccionada = signal<Date | null>(null);
  captchaValidado = signal<boolean>(false);

  constructor() {
    this.formulario = this.fb.group({
      especialidad: ['', Validators.required],
      especialista: ['', Validators.required],
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      comentario: ['']
    });
  }

  async ngOnInit() {
    this.loadingService.show();
    
    try {
      // Cargar especialidades
      this.especialidadesService.obtenerEspecialidades().subscribe({
        next: (esp) => {
          this.especialidades.set(esp);
          this.loadingService.hide();
        },
        error: () => this.loadingService.hide()
      });
    } catch (error) {
      this.loadingService.hide();
    }
  }

  onEspecialidadSeleccionada() {
    const especialidad = this.formulario.get('especialidad')?.value;
    if (!especialidad) {
      this.especialistas.set([]);
      this.formulario.patchValue({ especialista: '', fecha: '', hora: '' });
      return;
    }

    // Cargar especialistas de esa especialidad
    this.loadingService.show();
    this.userService.getUsuariosPorRol('especialista').subscribe({
      next: (usuarios) => {
        // Filtro mejorado: case-insensitive y normalización
        const especialidadNormalizada = especialidad.trim().toLowerCase();
        const especialistasFiltrados = usuarios.filter(u => {
          // Verificar que el usuario tenga especialidades
          if (!u.especialidades || !Array.isArray(u.especialidades)) {
            return false;
          }
          
          // Verificar que esté aprobado (debe ser explícitamente true)
          if (u.aprobado !== true) {
            return false;
          }
          
          // Buscar coincidencia case-insensitive
          return u.especialidades.some(esp => 
            esp && esp.trim().toLowerCase() === especialidadNormalizada
          );
        });
        
        this.especialistas.set(especialistasFiltrados);
        this.formulario.patchValue({ especialista: '', fecha: '', hora: '' });
        this.especialistaSeleccionado.set(null);
        this.disponibilidades.set([]);
        this.fechasDisponibles.set([]);
        this.horariosDisponibles.set([]);
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Error al cargar especialistas:', err);
        this.loadingService.hide();
      }
    });
  }

  onEspecialistaSeleccionado() {
    const especialistaId = this.formulario.get('especialista')?.value;
    if (!especialistaId) {
      this.especialistaSeleccionado.set(null);
      this.disponibilidades.set([]);
      this.formulario.patchValue({ fecha: '', hora: '' });
      return;
    }

    const especialidad = this.formulario.get('especialidad')?.value;
    const especialista = this.especialistas().find(e => e.uid === especialistaId);
    this.especialistaSeleccionado.set(especialista || null);

    // Cargar disponibilidades (puede haber múltiples con diferentes horarios)
    this.loadingService.show();
    this.disponibilidadService
      .getDisponibilidadPorEspecialistaYEspecialidad(especialistaId, especialidad)
      .subscribe({
        next: (disponibilidades) => {
          this.disponibilidades.set(disponibilidades);
          // Generar fechas disponibles combinando todas las disponibilidades
          this.generarFechasDisponibles(disponibilidades);
          this.formulario.patchValue({ fecha: '', hora: '' });
          this.loadingService.hide();
        },
        error: (err) => {
          console.error('Error al cargar disponibilidades:', err);
          this.disponibilidades.set([]);
          this.fechasDisponibles.set([]);
          this.loadingService.hide();
        }
      });
  }

  onFechaSeleccionada() {
    const fechaStr = this.formulario.get('fecha')?.value;
    if (!fechaStr) {
      this.fechaSeleccionada.set(null);
      this.horariosDisponibles.set([]);
      this.formulario.patchValue({ hora: '' });
      return;
    }

    // Crear fecha de forma explícita para evitar problemas de zona horaria
    // fechaStr está en formato "YYYY-MM-DD"
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fecha = new Date(year, month - 1, day, 0, 0, 0, 0); // Medianoche en hora local
    this.fechaSeleccionada.set(fecha);

    // Buscar la disponibilidad que corresponde a esta fecha
    const diaSemana = this.obtenerDiaSemana(fecha);
    const disponibilidad = this.disponibilidades().find(disp => 
      disp.dias && disp.dias.includes(diaSemana)
    );

    if (!disponibilidad) {
      this.horariosDisponibles.set([]);
      return;
    }

    const especialistaId = this.formulario.get('especialista')?.value;
    
    // Cargar turnos ocupados para esa fecha
    // Si falla la carga, asumimos que no hay turnos ocupados y mostramos todos los horarios disponibles
    this.loadingService.show();
    this.turnoService.getTurnosPorEspecialista(especialistaId).subscribe({
      next: (turnos) => {
        const turnosOcupados = turnos
          .filter(t => {
            // Comparar fechas de forma segura, solo comparando año, mes y día
            const fechaTurno = new Date(t.fecha);
            const fechaTurnoStr = fechaTurno.getFullYear() + '-' + 
              String(fechaTurno.getMonth() + 1).padStart(2, '0') + '-' + 
              String(fechaTurno.getDate()).padStart(2, '0');
            const fechaSeleccionadaStr = year + '-' + 
              String(month).padStart(2, '0') + '-' + 
              String(day).padStart(2, '0');
            
            return (
              fechaTurnoStr === fechaSeleccionadaStr &&
              (t.estado === 'aceptado' || t.estado === 'pendiente')
            );
          })
          .map(t => ({ hora: t.hora }));

        const horarios = this.disponibilidadService.generarHorariosDisponibles(
          disponibilidad,
          fecha,
          turnosOcupados
        );

        this.horariosDisponibles.set(horarios);
        this.formulario.patchValue({ hora: '' });
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Error al cargar turnos:', err);
        // Si falla la carga, mostramos los horarios disponibles sin filtrar turnos ocupados
        // Esto permite que el usuario pueda ver los horarios aunque haya un error con Firebase
        const horarios = this.disponibilidadService.generarHorariosDisponibles(
          disponibilidad,
          fecha,
          [] // Sin turnos ocupados
        );
        this.horariosDisponibles.set(horarios);
        this.loadingService.hide();
      }
    });
  }

  generarFechasDisponibles(disponibilidades: DisponibilidadEspecialista[]) {
    if (!disponibilidades || disponibilidades.length === 0) {
      this.fechasDisponibles.set([]);
      return;
    }

    const fechas: Date[] = [];
    const fechasUnicas = new Set<string>(); // Para evitar duplicados
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Generar fechas para los próximos 15 días (máximo)
    for (let i = 0; i < 15; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      
      const fechaStr = fecha.toDateString();

      // Verificar si el día está en alguna de las disponibilidades
      const diaSemana = this.obtenerDiaSemana(fecha);
      const tieneDisponibilidad = disponibilidades.some(disp => 
        disp.dias && disp.dias.includes(diaSemana)
      );

      if (tieneDisponibilidad && !fechasUnicas.has(fechaStr)) {
        fechas.push(fecha);
        fechasUnicas.add(fechaStr);
      }
    }

    this.fechasDisponibles.set(fechas);
  }

  private obtenerDiaSemana(fecha: Date): 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' {
    const dias: ('lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado')[] = 
      ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const indice = fecha.getDay();
    return dias[indice === 0 ? 6 : indice - 1];
  }

  formatearFechaParaInput(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  seleccionarFecha(fecha: Date) {
    this.formulario.patchValue({ fecha: this.formatearFechaParaInput(fecha), hora: '' });
    this.onFechaSeleccionada();
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

    // Crear fecha de forma explícita para evitar problemas de zona horaria
    // valores.fecha está en formato "YYYY-MM-DD"
    const [year, month, day] = valores.fecha.split('-').map(Number);
    const [hora, minutos] = valores.hora.split(':').map(Number);
    
    // Crear fecha en hora local (no UTC) para evitar desplazamientos
    const fechaCompleta = new Date(year, month - 1, day, hora, minutos, 0, 0);

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
        hora: valores.hora,
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
