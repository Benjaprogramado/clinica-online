import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
  collectionData,
  query,
  orderBy,
  where,
  Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Usuario, TipoUsuario } from '../models/user.model';

export interface LogIngreso {
  id?: string;
  usuarioId: string;
  email: string;
  nombre: string;
  apellido: string;
  role: TipoUsuario;
  fechaIngreso: Date;
  fechaIngresoTimestamp?: Timestamp;
}

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private firestore = inject(Firestore);
  private logsCollection = collection(this.firestore, 'logs');

  async registrarIngreso(usuario: Usuario): Promise<void> {
    try {
      await addDoc(this.logsCollection, {
        usuarioId: usuario.uid,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        role: usuario.role,
        fechaIngreso: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al registrar log de ingreso:', error);
    }
  }

  obtenerLogs(limit?: number): Observable<LogIngreso[]> {
    const q = query(this.logsCollection, orderBy('fechaIngreso', 'desc'));

    return collectionData(q, { idField: 'id' }).pipe(
      map((registros: any[]) =>
        registros.slice(0, limit ?? registros.length).map(registro => ({
          ...registro,
          fechaIngreso: registro.fechaIngreso?.toDate?.() || new Date(),
          fechaIngresoTimestamp: registro.fechaIngreso as Timestamp
        }))
      )
    );
  }

  obtenerLogsPorRango(fechaDesde: Date, fechaHasta: Date): Observable<LogIngreso[]> {
    const inicio = new Date(fechaDesde);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(fechaHasta);
    fin.setHours(23, 59, 59, 999);

    const inicioTimestamp = Timestamp.fromDate(inicio);
    const finTimestamp = Timestamp.fromDate(fin);

    const q = query(
      this.logsCollection,
      where('fechaIngreso', '>=', inicioTimestamp),
      where('fechaIngreso', '<=', finTimestamp),
      orderBy('fechaIngreso', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((registros: any[]) =>
        registros.map(registro => ({
          ...registro,
          fechaIngreso: registro.fechaIngreso?.toDate?.() || new Date(),
          fechaIngresoTimestamp: registro.fechaIngreso as Timestamp
        }))
      )
    );
  }
}
