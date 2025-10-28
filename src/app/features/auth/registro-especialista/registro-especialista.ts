import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { StorageService } from '../../../core/services/storage';
import { EspecialidadesService } from '../../../core/services/especialidades';

@Component({
  selector: 'app-registro-especialista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './registro-especialista.html',
  styleUrl: './registro-especialista.scss'
})
export class RegistroEspecialistaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private especialidadesService = inject(EspecialidadesService);
  private router = inject(Router);

  registroForm: FormGroup;
  cargando = signal(false);
  imagenPreview = signal<string | null>(null);
  imagenFile: File | null = null;

  especialidadesDisponibles: string[] = [];
  especialidadesSeleccionadas: string[] = [];
  nuevaEspecialidad = '';

  ngOnInit(): void {
    this.cargarEspecialidades();
  }

  async cargarEspecialidades(): Promise<void> {
    this.especialidadesService.obtenerEspecialidades().subscribe({
      next: (especialidades) => {
        this.especialidadesDisponibles = especialidades;
      },
      error: (error) => {
        console.error('Error cargando especialidades:', error);
        // Usar lista inicial en caso de error
        this.especialidadesDisponibles = [
          'Cardiología',
          'Dermatología',
          'Gastroenterología',
          'Neurología',
          'Oftalmología',
          'Pediatría',
          'Psiquiatría',
          'Traumatología'
        ];
      }
    });
  }

  constructor() {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(18), Validators.max(80)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPassword: ['', Validators.required]
    }, {
      validators: this.passwordsMatchValidator
    });
  }

  passwordsMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmar = form.get('confirmarPassword');
    
    if (password && confirmar && password.value !== confirmar.value) {
      confirmar.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  toggleEspecialidad(especialidad: string): void {
    const index = this.especialidadesSeleccionadas.indexOf(especialidad);
    if (index > -1) {
      this.especialidadesSeleccionadas.splice(index, 1);
    } else {
      this.especialidadesSeleccionadas.push(especialidad);
    }
  }

  async agregarNuevaEspecialidad(): Promise<void> {
    if (this.nuevaEspecialidad.trim()) {
      const especialidadNormalizada = this.capitalizarTexto(this.nuevaEspecialidad.trim());
      
      // Agregar a la selección actual
      this.especialidadesSeleccionadas.push(especialidadNormalizada);
      
      // Guardar en Firestore
      try {
        await this.especialidadesService.agregarEspecialidad(especialidadNormalizada);
        
        // Si no existe en la lista de disponibles, agregarla
        if (!this.especialidadesDisponibles.includes(especialidadNormalizada)) {
          this.especialidadesDisponibles.push(especialidadNormalizada);
          this.especialidadesDisponibles.sort();
        }
      } catch (error) {
        console.error('Error guardando especialidad:', error);
        // Continuar de todas formas
      }
      
      this.nuevaEspecialidad = '';
    }
  }

  private capitalizarTexto(texto: string): string {
    return texto
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
      .join(' ');
  }

  onImagenSeleccionada(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.imagenFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => this.imagenPreview.set(e.target.result);
      reader.readAsDataURL(file);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.registroForm.invalid || this.especialidadesSeleccionadas.length === 0) {
      this.registroForm.markAllAsTouched();
      if (this.especialidadesSeleccionadas.length === 0) {
        alert('Debes seleccionar al menos una especialidad');
      }
      return;
    }

    if (!this.imagenFile) {
      alert('Debes subir una imagen de perfil');
      return;
    }

    this.cargando.set(true);

    try {
      const formData = this.registroForm.value;
      
      // Agregar las especialidades seleccionadas (funciona sin autenticación gracias a las reglas)
      try {
        await this.especialidadesService.agregarEspecialidades(this.especialidadesSeleccionadas);
      } catch (error) {
        console.warn('Error al agregar especialidades:', error);
      }
      
      const nuevoUsuario = await this.authService.registrarUsuario(
        formData.email,
        formData.password,
        {
          nombre: formData.nombre,
          apellido: formData.apellido,
          edad: formData.edad,
          dni: formData.dni,
          especialidades: this.especialidadesSeleccionadas,
          role: 'especialista',
          imagenPerfil: '',
        }
      );

      const urlImagen = await this.storageService.subirImagenPerfil(
        this.imagenFile,
        nuevoUsuario.uid
      );

      await this.authService.actualizarImagenes(nuevoUsuario.uid, urlImagen);

      // El servicio auth ya redirige al login después de mostrar el mensaje
    } catch (error) {
      console.error('Error en registro:', error);
    } finally {
      this.cargando.set(false);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registroForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}