import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc, setDoc } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EspecialidadesService {
  private firestore = inject(Firestore);

  private ESPECIALIDADES_DOC_ID = 'configuracion';
  private ESPECIALIDADES_COLLECTION = 'especialidades';

  /**
   * Obtiene todas las especialidades disponibles desde Firestore
   */
  obtenerEspecialidades(): Observable<string[]> {
    const docRef = doc(this.firestore, this.ESPECIALIDADES_COLLECTION, this.ESPECIALIDADES_DOC_ID);
    
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          return data['lista'] || [];
        }
        // Retornar lista inicial si no existe el documento
        return this.getEspecialidadesIniciales();
      })
    );
  }

  /**
   * Agrega una nueva especialidad a la lista
   */
  async agregarEspecialidad(especialidad: string): Promise<void> {
    if (!especialidad.trim()) {
      return;
    }

    const especialidadCapitalizada = this.capitalizarTexto(especialidad.trim());
    const docRef = doc(this.firestore, this.ESPECIALIDADES_COLLECTION, this.ESPECIALIDADES_DOC_ID);
    
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const listaActual: string[] = data['lista'] || [];
      
      // Verificar si ya existe (case-insensitive)
      const existe = listaActual.some(
        esp => esp.toLowerCase() === especialidadCapitalizada.toLowerCase()
      );
      
      if (!existe) {
        listaActual.push(especialidadCapitalizada);
        listaActual.sort(); // Ordenar alfabéticamente
        await updateDoc(docRef, { lista: listaActual });
      }
    } else {
      // Crear documento con lista inicial + la nueva especialidad
      const listaInicial = this.getEspecialidadesIniciales();
      listaInicial.push(especialidadCapitalizada);
      listaInicial.sort();
      await setDoc(docRef, { lista: listaInicial });
    }
  }

  /**
   * Agrega múltiples especialidades si no existen
   */
  async agregarEspecialidades(especialidades: string[]): Promise<void> {
    for (const especialidad of especialidades) {
      await this.agregarEspecialidad(especialidad);
    }
  }

  /**
   * Retorna la lista inicial de especialidades por defecto
   */
  private getEspecialidadesIniciales(): string[] {
    return [
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

  /**
   * Capitaliza el texto correctamente
   */
  private capitalizarTexto(texto: string): string {
    return texto
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
      .join(' ');
  }
}

