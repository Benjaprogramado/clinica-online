import { Component, EventEmitter, Output, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { signal } from '@angular/core';

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

@Component({
  selector: 'app-recaptcha',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recaptcha.html',
  styleUrl: './recaptcha.scss'
})
export class RecaptchaComponent implements OnInit, OnDestroy {
  @Output() captchaValidado = new EventEmitter<boolean>();

  private platformId = inject(PLATFORM_ID);
  
  // Site key de Google reCAPTCHA v2
  // IMPORTANTE: Para producción, reemplazar con tu Site Key real de Google reCAPTCHA
  // Obtén tu key en: https://www.google.com/recaptcha/admin/create
  // La key actual es de prueba de Google (funciona siempre como válida)
  private readonly SITE_KEY = '6LfBkQEsAAAAAIAIyyBhX4obDPmH0ctiawefsdTS'; // Key de prueba - reemplazar con tu key real
  
  captchaValido = signal(false);
  captchaCargado = signal(false);
  widgetId: number | null = null;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarRecaptcha();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.widgetId !== null) {
      try {
        if (window.grecaptcha && window.grecaptcha.reset) {
          window.grecaptcha.reset(this.widgetId);
        }
      } catch (error) {
        console.error('Error al resetear reCAPTCHA:', error);
      }
    }
  }

  private cargarRecaptcha(): void {
    // Verificar si ya está cargado
    if (window.grecaptcha && window.grecaptcha.render) {
      this.inicializarCaptcha();
      return;
    }

    // Cargar script si no existe
    if (!document.querySelector('script[src*="recaptcha"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
      script.async = true;
      script.defer = true;
      
      window.onRecaptchaLoad = () => {
        this.inicializarCaptcha();
      };
      
      document.head.appendChild(script);
    } else {
      // Si el script existe pero grecaptcha no está disponible, esperar un momento
      setTimeout(() => {
        if (window.grecaptcha && window.grecaptcha.render) {
          this.inicializarCaptcha();
        }
      }, 500);
    }
  }

  private inicializarCaptcha(): void {
    if (!isPlatformBrowser(this.platformId) || !window.grecaptcha) {
      return;
    }

    setTimeout(() => {
      try {
        const container = document.getElementById('recaptcha-container');
        if (container && window.grecaptcha.render) {
          this.widgetId = window.grecaptcha.render(container, {
            sitekey: this.SITE_KEY,
            size: 'normal', // Normal: muestra checkbox, puede mostrar desafío
            theme: 'light', // light o dark
            callback: (token: string) => {
              this.captchaValido.set(true);
              this.captchaValidado.emit(true);
            },
            'expired-callback': () => {
              this.captchaValido.set(false);
              this.captchaValidado.emit(false);
            },
            'error-callback': () => {
              this.captchaValido.set(false);
              this.captchaValidado.emit(false);
            },
            'chalexpired-callback': () => {
              // Callback cuando el desafío expira
              this.captchaValido.set(false);
              this.captchaValidado.emit(false);
            }
          });
          this.captchaCargado.set(true);
          
          // Forzar el desafío de imágenes haciendo click programático en el checkbox
          // Esto activará el desafío visual de reCAPTCHA
          setTimeout(() => {
            this.forzarDesafioVisual();
          }, 300);
        }
      } catch (error) {
        console.error('Error al inicializar reCAPTCHA:', error);
      }
    }, 100);
  }

  /**
   * Intenta forzar el desafío visual de reCAPTCHA
   * Nota: Debido a políticas de seguridad, esto puede no funcionar.
   * La mejor forma es configurar el reCAPTCHA en Google Console
   * para que sea más estricto y muestre el desafío más frecuentemente.
   */
  private forzarDesafioVisual(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      // Buscar el contenedor del reCAPTCHA y hacer click programático
      // Esto puede activar el desafío visual
      const container = document.getElementById('recaptcha-container');
      if (container) {
        // Simular click en el área del reCAPTCHA
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        container.dispatchEvent(clickEvent);
      }
    } catch (error) {
      // Si falla, el usuario deberá interactuar manualmente con el checkbox
      // Esto es normal debido a las políticas de seguridad
    }
  }

  resetear(): void {
    if (this.widgetId !== null && window.grecaptcha && window.grecaptcha.reset) {
      window.grecaptcha.reset(this.widgetId);
      this.captchaValido.set(false);
      this.captchaValidado.emit(false);
    }
  }
}

