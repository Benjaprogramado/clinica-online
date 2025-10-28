import { DiaSemana } from './user.model';

export type EstadoTurno = 
  | 'pendiente' 
  | 'aceptado' 
  | 'rechazado' 
  | 'cancelado' 
  | 'realizado' 
  | 'resena-pendiente';

export interface Turno {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteApellido: string;
  pacienteDNI: string;
  pacienteEmail: string;
  pacienteObraSocial?: string;
  
  especialistaId: string;
  especialistaNombre: string;
  especialistaApellido: string;
  especialistaEmail: string;
  especialidad: string;
  
  fecha: Date;
  hora: string;
  fechaTimestamp: any; // Firestore Timestamp
  
  estado: EstadoTurno;
  comentarioPaciente?: string;
  comentarioEspecialista?: string;
  resena?: Resena;
  
  fechaCreacion: Date;
  fechaModificacion?: Date;
  fechaCreacionTimestamp?: any;
  fechaModificacionTimestamp?: any;
}

export interface Resena {
  calificacion: number; // 1-5
  comentario: string;
  fecha: Date;
  fechaTimestamp?: any;
}

export interface FiltroTurnos {
  estado?: EstadoTurno | 'todos';
  especialidad?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  especialistaId?: string;
  pacienteId?: string;
  textoBusqueda?: string;
}

export interface DisponibilidadEspecialista {
  id?: string;
  especialistaId: string;
  especialidad: string;
  dias: DiaSemana[];
  horaInicio: string; // Formato: "HH:mm"
  horaFin: string; // Formato: "HH:mm"
  duracionTurno: number; // En minutos (15, 30, 45, 60)
}


