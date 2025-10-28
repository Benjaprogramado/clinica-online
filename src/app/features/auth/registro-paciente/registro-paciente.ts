import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { StorageService } from '../../../core/services/storage';

@Component({
  selector: 'app-registro-paciente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registro-paciente.html',
  styleUrl: './registro-paciente.scss'
})
export class RegistroPacienteComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private router = inject(Router);

  registroForm: FormGroup;
  cargando = signal(false);
  imagen1Preview = signal<string | null>(null);
  imagen2Preview = signal<string | null>(null);
  imagen1File: File | null = null;
  imagen2File: File | null = null;

  constructor() {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      obraSocial: ['', Validators.required],
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

  onImagenSeleccionada(event: any, numero: 1 | 2): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (numero === 1) {
        this.imagen1File = file;
        const reader = new FileReader();
        reader.onload = (e: any) => this.imagen1Preview.set(e.target.result);
        reader.readAsDataURL(file);
      } else {
        this.imagen2File = file;
        const reader = new FileReader();
        reader.onload = (e: any) => this.imagen2Preview.set(e.target.result);
        reader.readAsDataURL(file);
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    if (!this.imagen1File || !this.imagen2File) {
      alert('Debes subir ambas imágenes de perfil');
      return;
    }

    this.cargando.set(true);

    try {
      const formData = this.registroForm.value;
      
      // Crear usuario en Auth
      const nuevoUsuario = await this.authService.registrarUsuario(
        formData.email,
        formData.password,
        {
          nombre: formData.nombre,
          apellido: formData.apellido,
          edad: formData.edad,
          dni: formData.dni,
          obraSocial: formData.obraSocial,
          role: 'paciente',
          imagenPerfil: '', // Temporal
          imagenPerfil2: '', // Temporal
        }
      );

      // Subir imágenes a Storage
      const urlImagen1 = await this.storageService.subirImagenPerfil(
        this.imagen1File,
        nuevoUsuario.uid,
        1
      );
      
      const urlImagen2 = await this.storageService.subirImagenPerfil(
        this.imagen2File,
        nuevoUsuario.uid,
        2
      );

      // Actualizar URLs en Firestore
      await this.authService.actualizarImagenes(nuevoUsuario.uid, urlImagen1, urlImagen2);

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