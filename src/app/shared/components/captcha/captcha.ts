import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './captcha.html',
  styleUrl: './captcha.scss'
})
export class CaptchaComponent {
  @Output() captchaValidado = new EventEmitter<boolean>();

  numero1 = signal(0);
  numero2 = signal(0);
  resultadoUsuario = signal<string>('');
  captchaCorrecto = signal(false);
  intentos = signal(0);

  constructor() {
    this.generarCaptcha();
  }

  generarCaptcha() {
    this.numero1.set(Math.floor(Math.random() * 10) + 1);
    this.numero2.set(Math.floor(Math.random() * 10) + 1);
    this.resultadoUsuario.set('');
    this.captchaCorrecto.set(false);
    this.captchaValidado.emit(false);
  }

  verificarCaptcha() {
    const resultadoCorrecto = this.numero1() + this.numero2();
    const resultadoIngresado = parseInt(this.resultadoUsuario());

    if (resultadoIngresado === resultadoCorrecto) {
      this.captchaCorrecto.set(true);
      this.captchaValidado.emit(true);
    } else {
      this.intentos.update(v => v + 1);
      this.captchaCorrecto.set(false);
      this.captchaValidado.emit(false);
      
      if (this.intentos() >= 3) {
        this.generarCaptcha();
        this.intentos.set(0);
      }
    }
  }

  onInputChange() {
    if (this.resultadoUsuario()) {
      this.verificarCaptcha();
    } else {
      this.captchaCorrecto.set(false);
      this.captchaValidado.emit(false);
    }
  }
}
