import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  private defaultConfig = {
    customClass: {
      popup: 'swal-dark-popup',
      confirmButton: 'btn btn-primary swal-confirm-btn',
      cancelButton: 'btn btn-secondary swal-cancel-btn'
    },
    buttonsStyling: false,
    background: '#1a1a2e',
    color: '#eee',
    confirmButtonColor: '#00adb5',
    cancelButtonColor: '#6c757d'
  };

  async showSuccess(title: string, text?: string): Promise<void> {
    await Swal.fire({
      ...this.defaultConfig,
      icon: 'success',
      title,
      text,
      confirmButtonText: 'Aceptar'
    });
  }

  async showError(title: string, text?: string): Promise<void> {
    await Swal.fire({
      ...this.defaultConfig,
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Aceptar'
    });
  }

  async showWarning(title: string, text?: string): Promise<void> {
    await Swal.fire({
      ...this.defaultConfig,
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'Aceptar'
    });
  }

  async showInfo(title: string, text?: string): Promise<void> {
    await Swal.fire({
      ...this.defaultConfig,
      icon: 'info',
      title,
      text,
      confirmButtonText: 'Aceptar'
    });
  }

  async promptTextarea(
    title: string,
    text: string,
    placeholder: string = '',
    confirmButtonText: string = 'Aceptar',
    cancelButtonText: string = 'Cancelar',
    minLength: number = 5
  ): Promise<string | null> {
    const result = await Swal.fire({
      ...this.defaultConfig,
      icon: 'question',
      title,
      text,
      input: 'textarea',
      inputPlaceholder: placeholder,
      inputAttributes: {
        'aria-label': placeholder
      },
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      inputValidator: value => {
        if (!value || value.trim().length < minLength) {
          return `Ingresa al menos ${minLength} caracteres.`;
        }
        return null;
      }
    });

    if (result.isConfirmed && typeof result.value === 'string') {
      return result.value.trim();
    }

    return null;
  }

  async confirm(
    title: string,
    text: string,
    confirmButtonText: string = 'Confirmar',
    cancelButtonText: string = 'Cancelar'
  ): Promise<boolean> {
    const result = await Swal.fire({
      ...this.defaultConfig,
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      customClass: {
        ...this.defaultConfig.customClass,
        actions: 'swal-actions-spaced'
      }
    });

    return result.isConfirmed;
  }
}
