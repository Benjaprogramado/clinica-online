import { Pipe, PipeTransform } from '@angular/core';
import { Usuario } from '../../core/models/user.model';

type NombreConvertible = Pick<Usuario, 'nombre' | 'apellido'> | { nombre?: string; apellido?: string };

@Pipe({
  name: 'nombreCompleto',
  standalone: true
})
export class NombreCompletoPipe implements PipeTransform {
  transform(valor: NombreConvertible | null | undefined, fallback: string = 'Sin nombre'): string {
    if (!valor) {
      return fallback;
    }

    const partes = [valor.nombre, valor.apellido].filter(Boolean);
    if (!partes.length) {
      return fallback;
    }

    return partes.join(' ');
  }
}

