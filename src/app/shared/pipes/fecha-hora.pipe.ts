import { Pipe, PipeTransform } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';

@Pipe({
  name: 'fechaHoraCorta',
  standalone: true
})
export class FechaHoraPipe implements PipeTransform {
  transform(valor: Date | string | Timestamp | null | undefined, formato: Intl.DateTimeFormatOptions = {}): string {
    if (!valor) {
      return '-';
    }

    let fecha: Date;
    if (valor instanceof Date) {
      fecha = valor;
    } else if (valor instanceof Timestamp) {
      fecha = valor.toDate();
    } else {
      const parsed = new Date(valor);
      fecha = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...formato
    };

    return fecha.toLocaleString('es-AR', opciones);
  }
}

