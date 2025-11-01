import { Component, inject, signal, output, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { StorageService } from '../../../../core/services/storage';
import { EspecialidadesService } from '../../../../core/services/especialidades';
import { NotificationService } from '../../../../core/services/notification';
import { TipoUsuario, Usuario } from '../../../../core/models/user.model';
import { RecaptchaComponent } from '../../../../shared/components/recaptcha/recaptcha';

@Component({
  selector: 'app-form-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RecaptchaComponent],
  templateUrl: './form-usuario.html',
  styleUrl: './form-usuario.scss'
})
export class FormUsuario implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private especialidadesService = inject(EspecialidadesService);
  private notificationService = inject(NotificationService);

  // Output para notificar cuando se crea un usuario exitosamente
  usuarioCreado = output<void>();

  registroForm!: FormGroup;
  cargando = signal(false);
  tipoUsuario = signal<'paciente' | 'especialista' | 'administrador'>('paciente');
  
  // Para pacientes
  imagen1Preview = signal<string | null>(null);
  imagen2Preview = signal<string | null>(null);
  imagen1File: File | null = null;
  imagen2File: File | null = null;

  // Para especialistas y administradores
  imagenPreview = signal<string | null>(null);
  imagenFile: File | null = null;

  // Para especialistas
  especialidadesDisponibles: string[] = [];
  especialidadesSeleccionadas: string[] = [];
  nuevaEspecialidad = '';

  // Obra social para pacientes
  obrasSociales = ['OSDE', 'Swiss Medical', 'Galeno', 'Medifé', 'Omint', 'Otra'];
  
  // reCAPTCHA
  captchaValido = signal(false);

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarEspecialidades();
  }

  inicializarFormulario(): void {
    this.registroForm = this.fb.group({
      tipoUsuario: ['paciente', Validators.required],
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

    // Escuchar cambios en el tipo de usuario
    this.registroForm.get('tipoUsuario')?.valueChanges.subscribe(tipo => {
      this.tipoUsuario.set(tipo);
      this.actualizarValidaciones();
    });
  }

  actualizarValidaciones(): void {
    const obraSocialControl = this.registroForm.get('obraSocial');
    const edadControl = this.registroForm.get('edad');

    if (this.tipoUsuario() === 'paciente') {
      obraSocialControl?.setValidators([Validators.required]);
      edadControl?.setValidators([Validators.required, Validators.min(1), Validators.max(120)]);
    } else {
      obraSocialControl?.clearValidators();
      obraSocialControl?.setValue('');
      
      if (this.tipoUsuario() === 'especialista') {
        edadControl?.setValidators([Validators.required, Validators.min(18), Validators.max(80)]);
      } else {
        edadControl?.setValidators([Validators.required, Validators.min(1), Validators.max(120)]);
      }
    }

    obraSocialControl?.updateValueAndValidity();
    edadControl?.updateValueAndValidity();
  }

  async cargarEspecialidades(): Promise<void> {
    this.especialidadesService.obtenerEspecialidades().subscribe({
      next: (especialidades: string[]) => {
        this.especialidadesDisponibles = especialidades;
      },
      error: (error: any) => {
        console.error('Error cargando especialidades:', error);
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

  passwordsMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmar = form.get('confirmarPassword');
    
    if (password && confirmar && password.value !== confirmar.value) {
      confirmar.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onImagenSeleccionada(event: any, numero?: 1 | 2): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (this.tipoUsuario() === 'paciente' && numero) {
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
      } else {
        this.imagenFile = file;
        const reader = new FileReader();
        reader.onload = (e: any) => this.imagenPreview.set(e.target.result);
        reader.readAsDataURL(file);
      }
    }
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
      
      this.especialidadesSeleccionadas.push(especialidadNormalizada);
      
      try {
        await this.especialidadesService.agregarEspecialidad(especialidadNormalizada);
        
        if (!this.especialidadesDisponibles.includes(especialidadNormalizada)) {
          this.especialidadesDisponibles.push(especialidadNormalizada);
          this.especialidadesDisponibles.sort();
        }
      } catch (error) {
        console.error('Error guardando especialidad:', error);
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

  onCaptchaValidado(valido: boolean) {
    this.captchaValido.set(valido);
  }

  async onSubmit(): Promise<void> {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    if (!this.captchaValido()) {
      await this.notificationService.showError(
        'Verificación requerida',
        'Debes completar la verificación reCAPTCHA antes de continuar.'
      );
      return;
    }

    // Validaciones específicas por tipo
    if (this.tipoUsuario() === 'paciente') {
      if (!this.imagen1File || !this.imagen2File) {
        await this.notificationService.showError(
          'Error',
          'Debes subir ambas imágenes de perfil para pacientes'
        );
        return;
      }
    } else {
      if (!this.imagenFile) {
        await this.notificationService.showError(
          'Error',
          'Debes subir una imagen de perfil'
        );
        return;
      }
    }

    if (this.tipoUsuario() === 'especialista' && this.especialidadesSeleccionadas.length === 0) {
      await this.notificationService.showError(
        'Error',
        'Debes seleccionar al menos una especialidad'
      );
      return;
    }

    this.cargando.set(true);

    try {
      const formData = this.registroForm.value;
      
      // Crear usuario en Auth primero para obtener el UID
      let nuevoUsuario: Usuario;
      
      if (this.tipoUsuario() === 'paciente') {
        // Crear usuario con imágenes vacías temporalmente
        nuevoUsuario = await this.authService.crearUsuarioDesdeAdmin(
          formData.email,
          formData.password,
          {
            nombre: formData.nombre,
            apellido: formData.apellido,
            edad: formData.edad,
            dni: formData.dni,
            obraSocial: formData.obraSocial,
            role: 'paciente' as TipoUsuario,
            imagenPerfil: '', // Temporal, se actualizará
            imagenPerfil2: '', // Temporal, se actualizará
          }
        );

        // Subir imágenes con el UID real
        const urlImagen1 = await this.storageService.subirImagenPerfil(
          this.imagen1File!,
          nuevoUsuario.uid,
          1
        );
        
        const urlImagen2 = await this.storageService.subirImagenPerfil(
          this.imagen2File!,
          nuevoUsuario.uid,
          2
        );

        // Actualizar URLs de imágenes
        await this.authService.actualizarImagenes(nuevoUsuario.uid, urlImagen1, urlImagen2);
      } else if (this.tipoUsuario() === 'especialista') {
        // Agregar especialidades
        try {
          await this.especialidadesService.agregarEspecialidades(this.especialidadesSeleccionadas);
        } catch (error) {
          console.warn('Error al agregar especialidades:', error);
        }

        // Crear usuario con imagen vacía temporalmente
        nuevoUsuario = await this.authService.crearUsuarioDesdeAdmin(
          formData.email,
          formData.password,
          {
            nombre: formData.nombre,
            apellido: formData.apellido,
            edad: formData.edad,
            dni: formData.dni,
            especialidades: this.especialidadesSeleccionadas,
            role: 'especialista' as TipoUsuario,
            imagenPerfil: '', // Temporal, se actualizará
            aprobado: false, // Los especialistas necesitan aprobación
          }
        );

        // Subir imagen con el UID real
        const urlImagen = await this.storageService.subirImagenPerfil(
          this.imagenFile!,
          nuevoUsuario.uid,
          1
        );

        // Actualizar URL de imagen
        await this.authService.actualizarImagenes(nuevoUsuario.uid, urlImagen);
      } else {
        // Administrador
        // Crear usuario con imagen vacía temporalmente
        nuevoUsuario = await this.authService.crearUsuarioDesdeAdmin(
          formData.email,
          formData.password,
          {
            nombre: formData.nombre,
            apellido: formData.apellido,
            edad: formData.edad,
            dni: formData.dni,
            role: 'administrador' as TipoUsuario,
            imagenPerfil: '', // Temporal, se actualizará
            aprobado: true, // Los administradores están aprobados por defecto
          }
        );

        // Subir imagen con el UID real
        const urlImagen = await this.storageService.subirImagenPerfil(
          this.imagenFile!,
          nuevoUsuario.uid,
          1
        );

        // Actualizar URL de imagen
        await this.authService.actualizarImagenes(nuevoUsuario.uid, urlImagen);
      }

      await this.notificationService.showSuccess(
        'Usuario Creado',
        `El usuario ${formData.nombre} ${formData.apellido} ha sido creado exitosamente. Se le ha enviado un email de verificación.`
      );

      // Resetear formulario
      this.resetFormulario();

      // Emitir evento y cerrar
      this.usuarioCreado.emit();
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      // El mensaje de error ya fue manejado por el servicio
    } finally {
      this.cargando.set(false);
    }
  }

  resetFormulario(): void {
    this.registroForm.reset({
      tipoUsuario: 'paciente'
    });
    this.tipoUsuario.set('paciente');
    this.imagen1Preview.set(null);
    this.imagen2Preview.set(null);
    this.imagenPreview.set(null);
    this.imagen1File = null;
    this.imagen2File = null;
    this.imagenFile = null;
    this.especialidadesSeleccionadas = [];
    this.nuevaEspecialidad = '';
    this.captchaValido.set(false);
    this.actualizarValidaciones();
  }

  cerrar(): void {
    this.usuarioCreado.emit();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registroForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
