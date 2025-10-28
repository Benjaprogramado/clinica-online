import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  CollectionReference,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { DisponibilidadEspecialista } from '../models/turno.model';
import { DiaSemana } from '../models/user.model';
import { NotificationService } from './notification';

@Injectable({
  providedIn: 'root'
})
export class DisponibilidadService {
  private firestore = inject(Firestore);
  private notificationService = inject(NotificationService);
  private disponibilidadCollection: CollectionReference;

  constructor() {
    this.disponibilidadCollection = collection(this.firestore, 'disponibilidad');
  }

  /**
   * Guarda o actualiza la disponibilidad de un especialista
   */
  async guardarDisponibilidad(disponibilidad: DisponibilidadEspecialista): Promise<void> {
    try {
      // Validar que haya al menos un día seleccionado
      if (!disponibilidad.dias || disponibilidad.dias.length === 0) {
        throw new Error('Debes seleccionar al menos un día');
      }

      // Validar horarios
      if (disponibilidad.horaInicio >= disponibilidad.horaFin) {
        throw new Error('La hora de fin debe ser mayor que la hora de inicio');
      }

      // Validar duración de turno
      if (![15, 30, 45, 60].includes(disponibilidad.duracionTurno)) {
        throw new Error('La duración del turno debe ser 15, 30, 45 o 60 minutos');
      }

      // Generar ID único basado en especialista y especialidad
      const id = `${disponibilidad.especialistaId}_${disponibilidad.especialidad}`;
      const docRef = doc(this.firestore, `disponibilidad/${id}`);

      await setDoc(docRef, {
        ...disponibilidad,
        id,
        fechaModificacion: serverTimestamp()
      }, { merge: true });

      await this.notificationService.showSuccess(
        'Disponibilidad guardada',
        'Tu disponibilidad horaria ha sido guardada correctamente.'
      );
    } catch (error: any) {
      await this.notificationService.showError(
        'Error al guardar disponibilidad',
        error.message || 'Ocurrió un error al guardar la disponibilidad.'
      );
      throw error;
    }
  }

  /**
   * Obtiene la disponibilidad de un especialista
   */
  getDisponibilidadPorEspecialista(especialistaId: string): Observable<DisponibilidadEspecialista[]> {
    const q = query(
      this.disponibilidadCollection,
      where('especialistaId', '==', especialistaId)
    );

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        return querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as DisponibilidadEspecialista));
      })
    );
  }

  /**
   * Obtiene la disponibilidad por especialidad
   */
  getDisponibilidadPorEspecialidad(especialidad: string): Observable<DisponibilidadEspecialista[]> {
    const q = query(
      this.disponibilidadCollection,
      where('especialidad', '==', especialidad)
    );

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        return querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as DisponibilidadEspecialista));
      })
    );
  }

  /**
   * Obtiene la disponibilidad de un especialista para una especialidad específica
   */
  getDisponibilidadPorEspecialistaYEspecialidad(
    especialistaId: string,
    especialidad: string
  ): Observable<DisponibilidadEspecialista | null> {
    const id = `${especialistaId}_${especialidad}`;
    const docRef = doc(this.firestore, `disponibilidad/${id}`);
    
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return {
            ...docSnap.data(),
            id: docSnap.id
          } as DisponibilidadEspecialista;
        }
        return null;
      })
    );
  }

  /**
   * Elimina la disponibilidad de un especialista
   */
  async eliminarDisponibilidad(especialistaId: string, especialidad: string): Promise<void> {
    try {
      const id = `${especialistaId}_${especialidad}`;
      const docRef = doc(this.firestore, `disponibilidad/${id}`);
      await deleteDoc(docRef);

      await this.notificationService.showSuccess(
        'Disponibilidad eliminada',
        'La disponibilidad ha sido eliminada correctamente.'
      );
    } catch (error: any) {
      await this.notificationService.showError(
        'Error al eliminar disponibilidad',
        error.message || 'Ocurrió un error al eliminar la disponibilidad.'
      );
      throw error;
    }
  }

  /**
   * Genera horarios disponibles basados en la disponibilidad
   */
  generarHorariosDisponibles(
    disponibilidad: DisponibilidadEspecialista,
    fecha: Date,
    turnosOcupados: { hora: string }[]
  ): string[] {
    // Obtener el día de la semana
    const diaSemana = this.obtenerDiaSemana(fecha);
    
    // Verificar si el día está en la disponibilidad
    if (!disponibilidad.dias.includes(diaSemana)) {
      return [];
    }

    const horarios: string[] = [];
    const [horaInicio, minutoInicio] = disponibilidad.horaInicio.split(':').map(Number);
    const [horaFin, minutoFin] = disponibilidad.horaFin.split(':').map(Number);
    
    const inicio = new Date(fecha);
    inicio.setHours(horaInicio, minutoInicio, 0, 0);
    
    const fin = new Date(fecha);
    fin.setHours(horaFin, minutoFin, 0, 0);

    let horaActual = new Date(inicio);
    
    while (horaActual < fin) {
      const horaString = `${String(horaActual.getHours()).padStart(2, '0')}:${String(horaActual.getMinutes()).padStart(2, '0')}`;
      
      // Verificar si no está ocupado
      const ocupado = turnosOcupados.some(t => t.hora === horaString);
      
      if (!ocupado) {
        horarios.push(horaString);
      }

      // Avanzar según la duración del turno
      horaActual.setMinutes(horaActual.getMinutes() + disponibilidad.duracionTurno);
    }

    return horarios;
  }

  /**
   * Convierte el día de la fecha a DiaSemana
   */
  private obtenerDiaSemana(fecha: Date): DiaSemana {
    const dias: ('lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado')[] = [
      'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
    ];
    
    const diaIndex = fecha.getDay();
    // Convertir domingo (0) a lunes (6), y ajustar el resto
    const diaMapeado = diaIndex === 0 ? 6 : diaIndex - 1;
    return dias[diaMapeado] || 'lunes';
  }
}
