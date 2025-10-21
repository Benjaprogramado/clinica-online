import { Component, inject, signal } from '@angular/core';
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
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loginForm: FormGroup;
  mostrarPassword = signal(false);
  cargando = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
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

  async loginRapido(tipo: 'paciente' | 'especialista' | 'admin'): Promise<void> {
    this.cargando.set(true);
    try {
      await this.authService.loginRapido(tipo);
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