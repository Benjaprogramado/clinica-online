import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'especialidadImagen',
  standalone: true
})
export class EspecialidadImagenPipe implements PipeTransform {
  private imagenesPorDefecto: { [key: string]: string } = {
    'Cardiología': 'assets/images/especialidades/cardiologia.png',
    'Dermatología': 'assets/images/especialidades/dermatologia.png',
    'Gastroenterología': 'assets/images/especialidades/gastroenterologia.png',
    'Neurología': 'assets/images/especialidades/neurologia.png',
    'Oftalmología': 'assets/images/especialidades/oftalmologia.png',
    'Pediatría': 'assets/images/especialidades/pediatria.png',
    'Psiquiatría': 'assets/images/especialidades/psiquiatria.png',
    'Traumatología': 'assets/images/especialidades/traumatologia.png'
  };

  private imagenDefault = 'assets/images/especialidades/default.png';

  transform(especialidad: string | null | undefined): string {
    if (!especialidad) {
      return this.imagenDefault;
    }

    // Buscar imagen por nombre exacto
    if (this.imagenesPorDefecto[especialidad]) {
      return this.imagenesPorDefecto[especialidad];
    }

    // Buscar imagen por nombre normalizado (case-insensitive)
    const especialidadNormalizada = especialidad.trim().toLowerCase();
    const claveEncontrada = Object.keys(this.imagenesPorDefecto).find(
      key => key.toLowerCase() === especialidadNormalizada
    );

    if (claveEncontrada) {
      return this.imagenesPorDefecto[claveEncontrada];
    }

    // Retornar imagen por defecto si no se encuentra
    return this.imagenDefault;
  }
}

