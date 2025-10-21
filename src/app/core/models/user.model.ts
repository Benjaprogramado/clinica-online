export type TipoUsuario = 'paciente' | 'especialista' | 'administrador';

export interface Usuario {
  uid: string;
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  email: string;
  role: TipoUsuario;
  imagenPerfil: string;
  imagenPerfil2?: string;
  fechaRegistro: Date;
  emailVerificado: boolean;
  
  obraSocial?: string;
  
  especialidades?: string[];
  aprobado?: boolean;
  disponibilidad?: DisponibilidadHoraria[];
  
  activo: boolean;
  ultimoIngreso?: Date;
}

export interface DisponibilidadHoraria {
  especialidad: string;
  dias: DiaSemana[];
  horaInicio: string;
  horaFin: string;
  duracionTurno: number;
}

export type DiaSemana = 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado';

