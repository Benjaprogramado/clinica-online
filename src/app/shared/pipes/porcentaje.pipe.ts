import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'porcentaje',
  standalone: true
})
export class PorcentajePipe implements PipeTransform {
  transform(valor: number | null | undefined, total: number | null | undefined, decimales: number = 1): string {
    if (!total || total <= 0 || valor === null || valor === undefined) {
      return '0%';
    }

    const porcentaje = (valor / total) * 100;
    return `${porcentaje.toFixed(decimales)}%`;
  }
}

