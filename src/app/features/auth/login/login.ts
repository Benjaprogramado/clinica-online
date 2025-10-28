import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  loginForm: FormGroup;
  mostrarPassword = signal(false);
  cargando = signal(false);
  usuariosPrueba = signal(this.authService.getUsuariosPrueba());

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async ngOnInit(): Promise<void> {
    // Cargar imágenes reales de los usuarios desde Firestore
    try {
      const usuariosActualizados = await this.authService.getUsuariosPruebaConImagenes();
      
      // Validar que las URLs de imágenes sean válidas antes de establecerlas
      for (const key in usuariosActualizados) {
        const usuario = usuariosActualizados[key];
        if (!usuario.imagenPerfil || usuario.imagenPerfil.trim() === '') {
          usuario.imagenPerfil = '';
        }
      }
      
      // Limpiar errores previos antes de establecer nuevos datos
      this.imagenErrorMap.set({});
      
      this.usuariosPrueba.set(usuariosActualizados);
      this.cdr.detectChanges();
      
      // Verificar solo admin después de establecer
      setTimeout(() => {
        const usuarios = this.usuariosPrueba();
        const admin = usuarios['admin'];
        if (admin) {
          const src = this.getImageSrc('admin');
          const shouldShow = this.shouldShowImage('admin');
          console.log('🔍 Admin - Estado:', {
            tieneImagen: !!(admin.imagenPerfil && admin.imagenPerfil.trim() !== ''),
            url: admin.imagenPerfil?.substring(0, 70) + '...',
            getImageSrc: src ? src.substring(0, 50) + '...' : '✗ VACÍO',
            shouldShowImage: shouldShow,
            tieneError: this.imagenErrorMap()['admin'] === true,
            signalValue: usuarios['admin']?.imagenPerfil?.substring(0, 50) + '...'
          });
        }
      }, 300);
    } catch (error) {
      console.error('Error cargando imágenes:', error);
    }
  }

  private imagenErrorMap = signal<{ [key: string]: boolean }>({});

  onImageError(event: Event, usuarioKey: string): void {
    if (usuarioKey === 'admin') {
      const img = event.target as HTMLImageElement;
      const src = img?.src;
      console.error(`❌ Admin - Error cargando imagen:`, src);
      
      // Si es un placeholder.com, no marcar como error porque sabemos que falla
      if (src?.includes('placeholder.com')) {
        console.log('⚠️ Ignorando error de placeholder.com');
        return;
      }
    }
    
    // Marcar que esta imagen falló al cargar
    this.imagenErrorMap.update(map => ({
      ...map,
      [usuarioKey]: true
    }));
  }

  onImageLoad(event: Event, usuarioKey: string): void {
    if (usuarioKey === 'admin') {
      const img = event.target as HTMLImageElement;
      console.log(`✅ Admin - Imagen cargada correctamente (${img?.naturalWidth}x${img?.naturalHeight}px)`);
    }
    
    // Marcar que esta imagen se cargó correctamente
    this.imagenErrorMap.update(map => {
      const newMap = { ...map };
      delete newMap[usuarioKey];
      return newMap;
    });
  }

  getImageSrc(usuarioKey: string): string {
    const usuarios = this.usuariosPrueba();
    const usuario = (usuarios as any)[usuarioKey];
    
    if (!usuario) {
      return '';
    }
    
    const imagenUrl = usuario.imagenPerfil;
    
    if (imagenUrl && typeof imagenUrl === 'string' && imagenUrl.trim() !== '') {
      // Excluir placeholders de placeholder.com que sabemos que fallan
      if (imagenUrl.includes('placeholder.com')) {
        return '';
      }
      return imagenUrl;
    }
    
    return '';
  }

  shouldShowPlaceholder(usuarioKey: string): boolean {
    const src = this.getImageSrc(usuarioKey);
    const hasError = this.imagenErrorMap()[usuarioKey] === true;
    const shouldShow = !src || src.trim() === '' || hasError;
    
    return shouldShow;
  }

  shouldShowImage(usuarioKey: string): boolean {
    const src = this.getImageSrc(usuarioKey);
    const hasError = this.imagenErrorMap()[usuarioKey] === true;
    const shouldShow = !!(src && src.trim() !== '' && !hasError);
    return shouldShow;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando.set(true);

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.login(email, password);
    } catch (error) {
      console.error('Error en login:', error);
    } finally {
      this.cargando.set(false);
    }
  }

  async loginRapido(usuario: 'paciente1' | 'paciente2' | 'paciente3' | 'especialista1' | 'especialista2' | 'admin'): Promise<void> {
    this.cargando.set(true);
    try {
      await this.authService.loginRapido(usuario);
    } catch (error) {
      console.error('Error en login rápido:', error);
    } finally {
      this.cargando.set(false);
    }
  }

  togglePassword(): void {
    this.mostrarPassword.update(value => !value);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}