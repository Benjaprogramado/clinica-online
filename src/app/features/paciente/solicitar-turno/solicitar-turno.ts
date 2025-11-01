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

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
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

  formulario: FormGroup;
  especialidades = signal<string[]>([]);
  especialistas = signal<Usuario[]>([]);
  disponibilidades = signal<DisponibilidadEspecialista[]>([]);
  fechasDisponibles = signal<Date[]>([]);
  horariosDisponibles = signal<string[]>([]);
  
  especialistaSeleccionado = signal<Usuario | null>(null);
  fechaSeleccionada = signal<Date | null>(null);

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

    // Cargar disponibilidad
    this.loadingService.show();
    this.disponibilidadService
      .getDisponibilidadPorEspecialistaYEspecialidad(especialistaId, especialidad)
      .subscribe({
        next: (disp) => {
          if (disp) {
            this.disponibilidades.set([disp]);
          } else {
            this.disponibilidades.set([]);
          }
          this.generarFechasDisponibles(disp);
          this.formulario.patchValue({ fecha: '', hora: '' });
          this.loadingService.hide();
        },
        error: () => this.loadingService.hide()
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

    const fecha = new Date(fechaStr);
    this.fechaSeleccionada.set(fecha);

    // Cargar turnos ocupados para esa fecha
    const disponibilidad = this.disponibilidades()[0];
    if (!disponibilidad) return;

    const especialistaId = this.formulario.get('especialista')?.value;
    
    this.loadingService.show();
    this.turnoService.getTurnosPorEspecialista(especialistaId).subscribe({
      next: (turnos) => {
        const turnosOcupados = turnos
          .filter(t => {
            const fechaTurno = new Date(t.fecha);
            return (
              fechaTurno.toDateString() === fecha.toDateString() &&
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
      error: () => this.loadingService.hide()
    });
  }

  generarFechasDisponibles(disponibilidad: DisponibilidadEspecialista | null) {
    if (!disponibilidad) {
      this.fechasDisponibles.set([]);
      return;
    }

    const fechas: Date[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Generar fechas para los próximos 60 días
    for (let i = 0; i < 60; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);

      // Verificar si el día está en la disponibilidad
      const diaSemana = this.obtenerDiaSemana(fecha);
      if (disponibilidad.dias.includes(diaSemana)) {
        fechas.push(fecha);
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

  async onSubmit() {
    if (this.formulario.invalid) {
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

    const fechaCompleta = new Date(valores.fecha);
    const [hora, minutos] = valores.hora.split(':');
    fechaCompleta.setHours(Number(hora), Number(minutos), 0, 0);

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

      this.router.navigate(['/paciente/mis-turnos']);
    } catch (error) {
      // Error manejado por el servicio
    } finally {
      this.loadingService.hide();
    }
  }
}
