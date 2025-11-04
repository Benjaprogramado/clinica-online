import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  CollectionReference,
  QueryConstraint,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Turno, EstadoTurno, FiltroTurnos } from '../models/turno.model';
import { NotificationService } from './notification';

@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  private firestore = inject(Firestore);
  private notificationService = inject(NotificationService);
  private turnosCollection: CollectionReference;

  constructor() {
    this.turnosCollection = collection(this.firestore, 'turnos');
  }

  /**
   * Crea un nuevo turno
   */
  async crearTurno(turno: Omit<Turno, 'id' | 'fechaCreacion' | 'fechaModificacion' | 'fechaTimestamp'>): Promise<string> {
    try {
      const turnoData = {
        ...turno,
        fechaTimestamp: Timestamp.fromDate(turno.fecha),
        fechaCreacionTimestamp: serverTimestamp()
      };

      const docRef = await addDoc(this.turnosCollection, turnoData);
      
      // No mostrar notificación aquí, el componente lo manejará
      return docRef.id;
    } catch (error: any) {
      await this.notificationService.showError(
        'Error al crear turno',
        error.message || 'Ocurrió un error al solicitar el turno.'
      );
      throw error;
    }
  }

  /**
   * Obtiene un turno por ID
   */
  getTurnoById(id: string): Observable<Turno | null> {
    const turnoDocRef = doc(this.firestore, `turnos/${id}`);
    return from(getDoc(turnoDocRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return this.convertirTurnoDesdeFirestore(docSnap.id, docSnap.data());
        }
        return null;
      })
    );
  }

  /**
   * Obtiene todos los turnos de un paciente
   * Nota: Se ordena en memoria para evitar requerir índice compuesto en Firestore
   * Ordena por fecha y hora ascendente (turno más próximo primero)
   */
  getTurnosPorPaciente(pacienteId: string): Observable<Turno[]> {
    const q = query(
      this.turnosCollection,
      where('pacienteId', '==', pacienteId)
    );

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        const turnos = querySnapshot.docs.map(doc => 
          this.convertirTurnoDesdeFirestore(doc.id, doc.data())
        );
        // Ordenar en memoria por fecha y hora ascendente (más próximo primero)
        return turnos.sort((a, b) => {
          const fechaA = a.fechaTimestamp?.toMillis() || 0;
          const fechaB = b.fechaTimestamp?.toMillis() || 0;
          
          // Si las fechas son diferentes, ordenar por fecha
          if (fechaA !== fechaB) {
            return fechaA - fechaB; // Ascendente
          }
          
          // Si la fecha es la misma, ordenar por hora
          const horaA = this.convertirHoraAMinutos(a.hora);
          const horaB = this.convertirHoraAMinutos(b.hora);
          return horaA - horaB; // Ascendente
        });
      })
    );
  }

  /**
   * Obtiene todos los turnos de un especialista
   * Nota: Se ordena en memoria para evitar requerir índice compuesto en Firestore
   * Ordena por fecha y hora ascendente (turno más próximo primero)
   */
  getTurnosPorEspecialista(especialistaId: string): Observable<Turno[]> {
    const q = query(
      this.turnosCollection,
      where('especialistaId', '==', especialistaId)
    );

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        const turnos = querySnapshot.docs.map(doc => 
          this.convertirTurnoDesdeFirestore(doc.id, doc.data())
        );
        // Ordenar en memoria por fecha y hora ascendente (más próximo primero)
        return turnos.sort((a, b) => {
          const fechaA = a.fechaTimestamp?.toMillis() || 0;
          const fechaB = b.fechaTimestamp?.toMillis() || 0;
          
          // Si las fechas son diferentes, ordenar por fecha
          if (fechaA !== fechaB) {
            return fechaA - fechaB; // Ascendente
          }
          
          // Si la fecha es la misma, ordenar por hora
          const horaA = this.convertirHoraAMinutos(a.hora);
          const horaB = this.convertirHoraAMinutos(b.hora);
          return horaA - horaB; // Ascendente
        });
      })
    );
  }

  /**
   * Obtiene todos los turnos (Admin)
   */
  getAllTurnos(): Observable<Turno[]> {
    const q = query(
      this.turnosCollection,
      orderBy('fechaTimestamp', 'desc')
    );

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        return querySnapshot.docs.map(doc => 
          this.convertirTurnoDesdeFirestore(doc.id, doc.data())
        );
      })
    );
  }

  /**
   * Obtiene turnos con filtros
   */
  getTurnosConFiltros(filtros: FiltroTurnos): Observable<Turno[]> {
    const constraints: QueryConstraint[] = [];

    if (filtros.estado && filtros.estado !== 'todos') {
      constraints.push(where('estado', '==', filtros.estado));
    }

    if (filtros.especialidad) {
      constraints.push(where('especialidad', '==', filtros.especialidad));
    }

    if (filtros.especialistaId) {
      constraints.push(where('especialistaId', '==', filtros.especialistaId));
    }

    if (filtros.pacienteId) {
      constraints.push(where('pacienteId', '==', filtros.pacienteId));
    }

    if (filtros.fechaDesde) {
      constraints.push(
        where('fechaTimestamp', '>=', Timestamp.fromDate(filtros.fechaDesde))
      );
    }

    if (filtros.fechaHasta) {
      const fechaHasta = new Date(filtros.fechaHasta);
      fechaHasta.setHours(23, 59, 59, 999);
      constraints.push(
        where('fechaTimestamp', '<=', Timestamp.fromDate(fechaHasta))
      );
    }

    constraints.push(orderBy('fechaTimestamp', 'desc'));

    const q = query(this.turnosCollection, ...constraints);

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        let turnos = querySnapshot.docs.map(doc => 
          this.convertirTurnoDesdeFirestore(doc.id, doc.data())
        );

        // Aplicar filtro de texto si existe
        if (filtros.textoBusqueda) {
          const texto = filtros.textoBusqueda.toLowerCase();
          turnos = turnos.filter(turno => 
            turno.pacienteNombre.toLowerCase().includes(texto) ||
            turno.pacienteApellido.toLowerCase().includes(texto) ||
            turno.especialistaNombre.toLowerCase().includes(texto) ||
            turno.especialistaApellido.toLowerCase().includes(texto) ||
            turno.especialidad.toLowerCase().includes(texto) ||
            turno.pacienteDNI.includes(texto)
          );
        }

        return turnos;
      })
    );
  }

  /**
   * Acepta un turno (Especialista)
   */
  async aceptarTurno(turnoId: string, comentario?: string): Promise<void> {
    try {
      const turnoDocRef = doc(this.firestore, `turnos/${turnoId}`);
      await updateDoc(turnoDocRef, {
        estado: 'aceptado',
        comentarioEspecialista: comentario || '',
        fechaModificacionTimestamp: serverTimestamp()
      });

      // No mostrar notificación aquí, el componente lo manejará
    } catch (error: any) {
      await this.notificationService.showError(
        'Error al aceptar turno',
        error.message || 'Ocurrió un error al aceptar el turno.'
      );
      throw error;
    }
  }

  /**
   * Rechaza un turno (Especialista)
   */
  async rechazarTurno(turnoId: string, comentario: string): Promise<void> {
    if (!comentario || comentario.trim().length < 5) {
      await this.notificationService.showError(
        'Comentario requerido',
        'Debes proporcionar un motivo de rechazo (mínimo 5 caracteres).'
      );
      throw new Error('Comentario de rechazo requerido');
    }

    try {
      const turnoDocRef = doc(this.firestore, `turnos/${turnoId}`);
      await updateDoc(turnoDocRef, {
        estado: 'rechazado',
        comentarioEspecialista: comentario,
        fechaModificacionTimestamp: serverTimestamp()
      });

      // No mostrar notificación aquí, el componente lo manejará
    } catch (error: any) {
      await this.notificationService.showError(
        'Error al rechazar turno',
        error.message || 'Ocurrió un error al rechazar el turno.'
      );
      throw error;
    }
  }

  /**
   * Cancela un turno (Paciente o Especialista)
   */
  async cancelarTurno(turnoId: string, comentario?: string): Promise<void> {
    try {
      const turnoDocRef = doc(this.firestore, `turnos/${turnoId}`);
      await updateDoc(turnoDocRef, {
        estado: 'cancelado',
        comentarioEspecialista: comentario || '',
        fechaModificacionTimestamp: serverTimestamp()
      });

      // No mostrar notificación aquí, el componente lo manejará
    } catch (error: any) {
      await this.notificationService.showError(
        'Error al cancelar turno',
        error.message || 'Ocurrió un error al cancelar el turno.'
      );
      throw error;
    }
  }

  /**
   * Finaliza un turno y permite reseña (Especialista)
   */
  async finalizarTurno(turnoId: string): Promise<void> {
    try {
      const turnoDocRef = doc(this.firestore, `turnos/${turnoId}`);
      await updateDoc(turnoDocRef, {
        estado: 'resena-pendiente',
        fechaModificacionTimestamp: serverTimestamp()
      });

      // No mostrar notificación aquí, el componente lo manejará
    } catch (error: any) {
      await this.notificationService.showError(
        'Error al finalizar turno',
        error.message || 'Ocurrió un error al finalizar el turno.'
      );
      throw error;
    }
  }

  /**
   * Guarda una reseña (Paciente)
   */
  async guardarResena(turnoId: string, calificacion: number, comentario: string): Promise<void> {
    if (calificacion < 1 || calificacion > 5) {
      throw new Error('La calificación debe estar entre 1 y 5');
    }

    if (!comentario || comentario.trim().length < 10) {
      throw new Error('El comentario debe tener al menos 10 caracteres');
    }

    try {
      const turnoDocRef = doc(this.firestore, `turnos/${turnoId}`);
      const resena = {
        calificacion,
        comentario: comentario.trim(),
        fecha: new Date(),
        fechaTimestamp: serverTimestamp()
      };

      await updateDoc(turnoDocRef, {
        estado: 'realizado',
        resena,
        fechaModificacionTimestamp: serverTimestamp()
      });

      // No mostrar notificación aquí, el componente lo manejará
    } catch (error: any) {
      await this.notificationService.showError(
        'Error al guardar reseña',
        error.message || 'Ocurrió un error al guardar la reseña.'
      );
      throw error;
    }
  }

  /**
   * Convierte hora en formato "HH:mm" a minutos desde medianoche
   */
  private convertirHoraAMinutos(hora: string): number {
    if (!hora || !hora.includes(':')) return 0;
    const [horas, minutos] = hora.split(':').map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }

  /**
   * Convierte datos de Firestore a modelo Turno
   */
  private convertirTurnoDesdeFirestore(id: string, data: any): Turno {
    const fechaTimestamp = data.fechaTimestamp as Timestamp;
    const fechaCreacionTimestamp = data.fechaCreacionTimestamp as Timestamp;
    const fechaModificacionTimestamp = data.fechaModificacionTimestamp as Timestamp;
    const resenaFechaTimestamp = data.resena?.fechaTimestamp as Timestamp;

    // Convertir fechaTimestamp a Date de forma segura
    let fecha: Date;
    if (fechaTimestamp && fechaTimestamp.toDate) {
      fecha = fechaTimestamp.toDate();
    } else if (data.fecha && data.fecha instanceof Date) {
      fecha = data.fecha;
    } else if (data.fecha && typeof data.fecha === 'string') {
      fecha = new Date(data.fecha);
    } else {
      // Si no hay fecha válida, usar una fecha por defecto muy antigua para evitar confusión
      console.warn(`Turno ${id} no tiene fecha válida. Usando fecha por defecto.`);
      fecha = new Date(2000, 0, 1);
    }

    return {
      id,
      pacienteId: data.pacienteId,
      pacienteNombre: data.pacienteNombre,
      pacienteApellido: data.pacienteApellido,
      pacienteDNI: data.pacienteDNI,
      pacienteEmail: data.pacienteEmail,
      pacienteObraSocial: data.pacienteObraSocial,
      especialistaId: data.especialistaId,
      especialistaNombre: data.especialistaNombre,
      especialistaApellido: data.especialistaApellido,
      especialistaEmail: data.especialistaEmail,
      especialidad: data.especialidad,
      fecha,
      hora: data.hora,
      fechaTimestamp,
      estado: data.estado as EstadoTurno,
      comentarioPaciente: data.comentarioPaciente,
      comentarioEspecialista: data.comentarioEspecialista,
      resena: data.resena ? {
        calificacion: data.resena.calificacion,
        comentario: data.resena.comentario,
        fecha: resenaFechaTimestamp?.toDate() || new Date(),
        fechaTimestamp: resenaFechaTimestamp
      } : undefined,
      fechaCreacion: fechaCreacionTimestamp?.toDate() || new Date(),
      fechaModificacion: fechaModificacionTimestamp?.toDate(),
      fechaCreacionTimestamp,
      fechaModificacionTimestamp
    };
  }
}
