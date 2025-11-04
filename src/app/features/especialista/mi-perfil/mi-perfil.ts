import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';
import { DisponibilidadService } from '../../../core/services/disponibilidad';
import { EspecialidadesService } from '../../../core/services/especialidades';
import { DisponibilidadEspecialista } from '../../../core/models/turno.model';
import { DiaSemana, Usuario } from '../../../core/models/user.model';
import { LoadingService } from '../../../core/services/loading';
import { NotificationService } from '../../../core/services/notification';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-mi-perfil-especialista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.scss'
})
export class MiPerfilEspecialistaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private disponibilidadService = inject(DisponibilidadService);
  private especialidadesService = inject(EspecialidadesService);
  private loadingService = inject(LoadingService);
  private notificationService = inject(NotificationService);

  formulario: FormGroup;
  especialidades = signal<string[]>([]);
  disponibilidadesGuardadas = signal<DisponibilidadEspecialista[]>([]);
  especialista = signal<Usuario | null>(null);

  diasSemana: DiaSemana[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  duracionesTurno = [30, 45, 60]; // Duración mínima de 30 minutos
  horariosClinica = {
    lunes: { inicio: '08:00', fin: '19:00' },
    martes: { inicio: '08:00', fin: '19:00' },
    miercoles: { inicio: '08:00', fin: '19:00' },
    jueves: { inicio: '08:00', fin: '19:00' },
    viernes: { inicio: '08:00', fin: '19:00' },
    sabado: { inicio: '08:00', fin: '14:00' }
  };

  constructor() {
    // Crear FormArray para cada día con sus horarios
    const diasFormArray = this.fb.array(
      this.diasSemana.map(dia => 
        this.fb.group({
          dia: [dia],
          seleccionado: [false],
          horaInicio: [this.getHorarioInicio(dia), Validators.required],
          horaFin: [this.getHorarioFin(dia), Validators.required]
        })
      )
    );

    this.formulario = this.fb.group({
      especialidad: ['', Validators.required],
      dias: diasFormArray,
      duracionTurno: [30, Validators.required]
    });
  }

  async ngOnInit() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.loadingService.show();

    try {
      // Cargar datos del especialista
      this.especialista.set(currentUser);

      // Cargar especialidades
      this.especialidadesService.obtenerEspecialidades().subscribe({
        next: (esp) => {
          this.especialidades.set(esp);
          
          // Seleccionar automáticamente la primera especialidad del especialista si tiene solo una
          const especialidadesDelEspecialista = this.obtenerEspecialidades();
          if (especialidadesDelEspecialista.length === 1) {
            this.formulario.patchValue({ especialidad: especialidadesDelEspecialista[0] });
          }
        }
      });

      // Cargar disponibilidades guardadas
      this.disponibilidadService.getDisponibilidadPorEspecialista(currentUser.uid).subscribe({
        next: (disp) => {
          this.disponibilidadesGuardadas.set(disp);
          this.loadingService.hide();
        },
        error: () => this.loadingService.hide()
      });
    } catch (error) {
      this.loadingService.hide();
    }
  }

  // Filtrar solo las especialidades del especialista
  especialidadesDelEspecialista(): string[] {
    const especialidadesUsuario = this.obtenerEspecialidades();
    const todasLasEspecialidades = this.especialidades();
    return todasLasEspecialidades.filter(esp => especialidadesUsuario.includes(esp));
  }

  get diasArray(): FormArray {
    return this.formulario.get('dias') as FormArray;
  }

  getDiaFormGroup(index: number): FormGroup {
    return this.diasArray.at(index) as FormGroup;
  }

  diaEstaSeleccionado(index: number): boolean {
    return this.getDiaFormGroup(index).get('seleccionado')?.value || false;
  }

  getHorarioInicio(dia: DiaSemana): string {
    if (!dia) return '08:00'; // Valor por defecto
    const clave = dia === 'miércoles' ? 'miercoles' : dia === 'sábado' ? 'sabado' : dia;
    const horario = this.horariosClinica[clave as keyof typeof this.horariosClinica];
    return horario?.inicio || '08:00'; // Valor por defecto si no existe
  }

  getHorarioFin(dia: DiaSemana): string {
    if (!dia) return '19:00'; // Valor por defecto
    const clave = dia === 'miércoles' ? 'miercoles' : dia === 'sábado' ? 'sabado' : dia;
    const horario = this.horariosClinica[clave as keyof typeof this.horariosClinica];
    return horario?.fin || '19:00'; // Valor por defecto si no existe
  }

  getHorarioMin(dia: DiaSemana): string {
    return this.getHorarioInicio(dia);
  }

  getHorarioMax(dia: DiaSemana): string {
    return this.getHorarioFin(dia);
  }

  validarHorarioAlCambiar(index: number, dia: DiaSemana, campo: 'horaInicio' | 'horaFin') {
    const diaGroup = this.getDiaFormGroup(index);
    const horaInicio = diaGroup.get('horaInicio')?.value;
    const horaFin = diaGroup.get('horaFin')?.value;
    
    if (!horaInicio || !horaFin) return;
    
    const minHorario = this.getHorarioMin(dia);
    const maxHorario = this.getHorarioMax(dia);
    
    // Validar y corregir si está fuera del rango
    if (campo === 'horaInicio') {
      if (horaInicio < minHorario) {
        diaGroup.patchValue({ horaInicio: minHorario }, { emitEvent: false });
      }
      if (horaInicio >= maxHorario) {
        diaGroup.patchValue({ horaInicio: minHorario }, { emitEvent: false });
      }
      if (horaInicio >= horaFin) {
        // Si inicio es mayor o igual a fin, ajustar fin
        const nuevaHoraFin = this.calcularHoraSiguiente(horaInicio, dia);
        if (nuevaHoraFin <= maxHorario) {
          diaGroup.patchValue({ horaFin: nuevaHoraFin }, { emitEvent: false });
        }
      }
    } else {
      if (horaFin > maxHorario) {
        diaGroup.patchValue({ horaFin: maxHorario }, { emitEvent: false });
      }
      if (horaFin <= minHorario) {
        diaGroup.patchValue({ horaFin: maxHorario }, { emitEvent: false });
      }
      if (horaInicio >= horaFin) {
        // Si inicio es mayor o igual a fin, ajustar inicio
        const nuevaHoraInicio = this.calcularHoraAnterior(horaFin, dia);
        if (nuevaHoraInicio >= minHorario) {
          diaGroup.patchValue({ horaInicio: nuevaHoraInicio }, { emitEvent: false });
        }
      }
    }
  }

  calcularHoraSiguiente(hora: string, dia: DiaSemana): string {
    const [horas, minutos] = hora.split(':').map(Number);
    const nuevaHora = new Date();
    nuevaHora.setHours(horas, minutos + 30, 0, 0); // Agregar 30 minutos mínimo
    return `${String(nuevaHora.getHours()).padStart(2, '0')}:${String(nuevaHora.getMinutes()).padStart(2, '0')}`;
  }

  calcularHoraAnterior(hora: string, dia: DiaSemana): string {
    const [horas, minutos] = hora.split(':').map(Number);
    const nuevaHora = new Date();
    nuevaHora.setHours(horas, minutos - 30, 0, 0); // Restar 30 minutos mínimo
    return `${String(nuevaHora.getHours()).padStart(2, '0')}:${String(nuevaHora.getMinutes()).padStart(2, '0')}`;
  }

  validarHorario(index: number, dia?: DiaSemana): boolean {
    const diaGroup = this.getDiaFormGroup(index);
    const horaInicio = diaGroup.get('horaInicio')?.value;
    const horaFin = diaGroup.get('horaFin')?.value;
    const diaValue = dia || diaGroup.get('dia')?.value as DiaSemana;
    
    if (!horaInicio || !horaFin || !diaValue) return false;
    
    const minHorario = this.getHorarioMin(diaValue);
    const maxHorario = this.getHorarioMax(diaValue);
    
    return horaInicio >= minHorario && horaFin <= maxHorario && horaInicio < horaFin;
  }

  tieneDiasSeleccionados(): boolean {
    return this.diasArray.controls.some((control, index) => {
      return this.diaEstaSeleccionado(index);
    });
  }

  tieneEspecialidades(): boolean {
    const esp = this.especialista();
    return !!(esp?.especialidades && esp.especialidades.length > 0);
  }

  obtenerEspecialidades(): string[] {
    return this.especialista()?.especialidades || [];
  }

  async onSubmit() {
    if (this.formulario.invalid) {
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    const valores = this.formulario.value;
    const diasSeleccionados = valores.dias
      .filter((dia: any, index: number) => dia.seleccionado)
      .map((dia: any) => dia.dia);

    if (diasSeleccionados.length === 0) {
      await this.notificationService.showWarning(
        'Días no seleccionados',
        'Debes seleccionar al menos un día'
      );
      return;
    }

    // Validar que todos los horarios sean válidos
    for (let i = 0; i < valores.dias.length; i++) {
      const diaGroup = this.getDiaFormGroup(i);
      if (diaGroup.get('seleccionado')?.value) {
        if (!this.validarHorario(i)) {
          const dia = diaGroup.get('dia')?.value;
          await this.notificationService.showError(
            'Horarios inválidos',
            `Los horarios del ${this.obtenerTextoDia(dia)} no son válidos. Deben estar dentro del rango de atención de la clínica.`
          );
          return;
        }
      }
    }

    // Agrupar por horarios (por si hay múltiples horarios diferentes)
    const disponibilidadesPorHorario = new Map<string, { dias: DiaSemana[], horaInicio: string, horaFin: string }>();
    
    valores.dias.forEach((diaForm: any) => {
      if (diaForm.seleccionado) {
        const clave = `${diaForm.horaInicio}-${diaForm.horaFin}`;
        if (!disponibilidadesPorHorario.has(clave)) {
          disponibilidadesPorHorario.set(clave, {
            dias: [],
            horaInicio: diaForm.horaInicio,
            horaFin: diaForm.horaFin
          });
        }
        disponibilidadesPorHorario.get(clave)!.dias.push(diaForm.dia);
      }
    });

    this.loadingService.show();
    try {
      // Guardar cada disponibilidad (una por cada combinación de horarios)
      for (const [clave, data] of disponibilidadesPorHorario) {
        const disponibilidad: DisponibilidadEspecialista = {
          especialistaId: currentUser.uid,
          especialidad: valores.especialidad,
          dias: data.dias,
          horaInicio: data.horaInicio,
          horaFin: data.horaFin,
          duracionTurno: valores.duracionTurno
        };

        await this.disponibilidadService.guardarDisponibilidad(disponibilidad);
      }
      
      // Esperar a que se complete la recarga de disponibilidades usando firstValueFrom
      const disponibilidades = await firstValueFrom(
        this.disponibilidadService.getDisponibilidadPorEspecialista(currentUser.uid)
      );
      this.disponibilidadesGuardadas.set(disponibilidades);
      
      // Resetear formulario pero mantener la especialidad seleccionada si solo hay una
      const especialidadesDelEspecialista = this.obtenerEspecialidades();
      const especialidadActual = valores.especialidad;
      
      this.formulario.reset({
        especialidad: especialidadesDelEspecialista.length === 1 ? especialidadesDelEspecialista[0] : '',
        duracionTurno: 30
      });
      
      // Si había una especialidad seleccionada y sigue siendo válida, mantenerla
      if (especialidadesDelEspecialista.includes(especialidadActual)) {
        this.formulario.patchValue({ especialidad: especialidadActual });
      }
      
      // Resetear días
      this.diasArray.controls.forEach((control, index) => {
        const dia = this.diasSemana[index];
        control.patchValue({
          seleccionado: false,
          horaInicio: this.getHorarioInicio(dia),
          horaFin: this.getHorarioFin(dia)
        });
      });
      
      // Ocultar loading ANTES de mostrar el SweetAlert2
      this.loadingService.hide();
      
      // Mostrar notificación de éxito después de ocultar el loading
      await this.notificationService.showSuccess(
        'Disponibilidad guardada',
        'Tu disponibilidad horaria ha sido guardada correctamente.'
      );
    } catch (error) {
      // Ocultar loading en caso de error también
      this.loadingService.hide();
      // El error ya fue manejado por el servicio
    }
  }

  cargarDisponibilidades() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.disponibilidadService.getDisponibilidadPorEspecialista(currentUser.uid).subscribe({
      next: (disp) => {
        this.disponibilidadesGuardadas.set(disp);
      }
    });
  }

  async eliminarDisponibilidad(disponibilidad: DisponibilidadEspecialista) {
    const confirmado = await this.notificationService.confirm(
      '¿Eliminar disponibilidad?',
      '¿Estás seguro de eliminar esta disponibilidad? Esta acción no se puede deshacer.',
      'Eliminar',
      'Cancelar'
    );

    if (!confirmado) {
      return;
    }

    this.loadingService.show();
    try {
      // Eliminar la disponibilidad usando el ID
      if (!disponibilidad.id) {
        throw new Error('ID de disponibilidad no encontrado');
      }
      
      await this.disponibilidadService.eliminarDisponibilidad(disponibilidad.id);
      
      // Recargar disponibilidades
      const currentUser = this.authService.currentUser();
      if (currentUser) {
        const disponibilidades = await firstValueFrom(
          this.disponibilidadService.getDisponibilidadPorEspecialista(currentUser.uid)
        );
        this.disponibilidadesGuardadas.set(disponibilidades);
      }
      
      // Ocultar loading ANTES de mostrar el SweetAlert2
      this.loadingService.hide();
      
      // Mostrar notificación de éxito después de ocultar el loading
      await this.notificationService.showSuccess(
        'Disponibilidad eliminada',
        'La disponibilidad ha sido eliminada correctamente.'
      );
    } catch (error) {
      // Ocultar loading en caso de error también
      this.loadingService.hide();
      // El error ya fue manejado por el servicio
    }
  }

  obtenerTextoDia(dia: DiaSemana): string {
    const textos: { [key: string]: string } = {
      'lunes': 'Lunes',
      'martes': 'Martes',
      'miércoles': 'Miércoles',
      'jueves': 'Jueves',
      'viernes': 'Viernes',
      'sábado': 'Sábado'
    };
    return textos[dia] || dia;
  }
}
