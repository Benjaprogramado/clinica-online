import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { StorageService } from '../../../core/services/storage';

@Component({
  selector: 'app-registro-especialista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './registro-especialista.html',
  styleUrl: './registro-especialista.scss'
})
export class RegistroEspecialistaComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private router = inject(Router);

  registroForm: FormGroup;
  cargando = signal(false);
  imagenPreview = signal<string | null>(null);
  imagenFile: File | null = null;

  especialidadesDisponibles = [
    'Cardiología',
    'Dermatología',
    'Gastroenterología',
    'Neurología',
    'Oftalmología',
    'Pediatría',
    'Psiquiatría',
    'Traumatología'
  ];

  especialidadesSeleccionadas: string[] = [];
  nuevaEspecialidad = '';

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

  agregarNuevaEspecialidad(): void {
    if (this.nuevaEspecialidad.trim()) {
      this.especialidadesSeleccionadas.push(this.nuevaEspecialidad.trim());
      this.nuevaEspecialidad = '';
    }
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

      this.router.navigate(['/pendiente-aprobacion']);
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