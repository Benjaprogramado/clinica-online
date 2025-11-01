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
