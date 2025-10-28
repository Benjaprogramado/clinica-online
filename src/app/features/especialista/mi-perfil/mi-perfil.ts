import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';
import { DisponibilidadService } from '../../../core/services/disponibilidad';
import { EspecialidadesService } from '../../../core/services/especialidades';
import { DisponibilidadEspecialista } from '../../../core/models/turno.model';
import { DiaSemana } from '../../../core/models/user.model';
import { LoadingService } from '../../../core/services/loading';

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

  formulario: FormGroup;
  especialidades = signal<string[]>([]);
  disponibilidadesGuardadas = signal<DisponibilidadEspecialista[]>([]);

  diasSemana: DiaSemana[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  duracionesTurno = [15, 30, 45, 60];

  constructor() {
    this.formulario = this.fb.group({
      especialidad: ['', Validators.required],
      dias: this.fb.array([], Validators.required),
      horaInicio: ['08:00', Validators.required],
      horaFin: ['18:00', Validators.required],
      duracionTurno: [30, Validators.required]
    });
  }

  async ngOnInit() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.loadingService.show();

    try {
      // Cargar especialidades
      this.especialidadesService.obtenerEspecialidades().subscribe({
        next: (esp) => {
          this.especialidades.set(esp);
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

  get diasArray(): FormArray {
    return this.formulario.get('dias') as FormArray;
  }

  toggleDia(dia: DiaSemana) {
    const diasArray = this.diasArray;
    const index = diasArray.value.indexOf(dia);

    if (index === -1) {
      diasArray.push(this.fb.control(dia));
    } else {
      diasArray.removeAt(index);
    }
  }

  diaEstaSeleccionado(dia: DiaSemana): boolean {
    return this.diasArray.value.includes(dia);
  }

  async onSubmit() {
    if (this.formulario.invalid) {
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    const valores = this.formulario.value;

    if (valores.dias.length === 0) {
      return;
    }

    if (valores.horaInicio >= valores.horaFin) {
      return;
    }

    this.loadingService.show();
    try {
      const disponibilidad: DisponibilidadEspecialista = {
        especialistaId: currentUser.uid,
        especialidad: valores.especialidad,
        dias: valores.dias,
        horaInicio: valores.horaInicio,
        horaFin: valores.horaFin,
        duracionTurno: valores.duracionTurno
      };

      await this.disponibilidadService.guardarDisponibilidad(disponibilidad);
      this.cargarDisponibilidades();
      this.formulario.reset({
        horaInicio: '08:00',
        horaFin: '18:00',
        duracionTurno: 30
      });
      this.diasArray.clear();
    } catch (error) {
      // Error manejado por el servicio
    } finally {
      this.loadingService.hide();
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
    if (!confirm('¿Estás seguro de eliminar esta disponibilidad?')) {
      return;
    }

    this.loadingService.show();
    try {
      await this.disponibilidadService.eliminarDisponibilidad(
        disponibilidad.especialistaId,
        disponibilidad.especialidad
      );
      this.cargarDisponibilidades();
    } catch (error) {
      // Error manejado por el servicio
    } finally {
      this.loadingService.hide();
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
