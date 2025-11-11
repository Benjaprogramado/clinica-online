import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Usuario } from '../models/user.model';
import { HistoriaClinica, Turno } from '../models/turno.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private logoDataUrlCache?: string | null;

  async exportarUsuariosExcel(usuarios: Usuario[]): Promise<void> {
    if (!usuarios || usuarios.length === 0) {
      return;
    }

    const data = usuarios.map(usuario => ({
      UID: usuario.uid,
      Nombre: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim(),
      Email: usuario.email,
      Rol: usuario.role,
      'Obra Social': usuario.obraSocial || '-',
      Especialidades: usuario.especialidades?.join(', ') || '-',
      Aprobado: usuario.aprobado ? 'Sí' : 'No',
      Activo: usuario.activo ? 'Sí' : 'No',
      'Fecha Registro': this.formatearFecha(usuario.fechaRegistro)
    }));

    await this.generarExcel('usuarios_clinica', 'Usuarios', data);
  }

  async exportarTurnosPacienteExcel(turnos: Turno[]): Promise<void> {
    if (!turnos || turnos.length === 0) {
      return;
    }

    const pacienteReferencia = turnos[0];
    const data = turnos.map(turno => ({
      Fecha: this.formatearFecha(turno.fecha),
      Hora: turno.hora,
      Especialidad: turno.especialidad,
      Especialista: `${turno.especialistaNombre} ${turno.especialistaApellido}`,
      Estado: turno.estado,
      'Comentario Paciente': turno.comentarioPaciente || '-',
      'Comentario Especialista': turno.comentarioEspecialista || '-',
      'Hist. Altura (cm)': turno.historiaClinica?.altura ?? '',
      'Hist. Peso (kg)': turno.historiaClinica?.peso ?? '',
      'Hist. Temperatura (°C)': turno.historiaClinica?.temperatura ?? '',
      'Hist. Presión': turno.historiaClinica?.presion ?? '',
      'Hist. Diagnóstico': turno.historiaClinica?.comentarioDiagnostico || '-',
      'Hist. Datos Extras': this.formatearDatosExtras(turno.historiaClinica)
    }));

    const nombreArchivo = `turnos_${pacienteReferencia.pacienteApellido?.toLowerCase() || 'paciente'}_${this.obtenerFechaArchivo()}`;
    await this.generarExcel(nombreArchivo, 'Turnos', data);
  }

  async exportarHistoriaClinicaPdf(opciones: {
    pacienteNombre: string;
    pacienteApellido: string;
    pacienteDni?: string;
    especialidadSeleccionada?: string;
    historias: HistoriaClinica[];
  }): Promise<void> {
    if (!opciones.historias || opciones.historias.length === 0) {
      return;
    }

    const doc = new jsPDF();
    const margen = 40;
    let cursorY = 60;

    const logo = await this.obtenerLogoDataUrl();
    if (logo) {
      doc.addImage(logo, 'PNG', margen, cursorY - 20, 80, 40);
    }

    doc.setFontSize(18);
    doc.text('Informe de Historia Clínica', margen, cursorY + 30);

    cursorY += 60;

    doc.setFontSize(12);
    doc.text(`Paciente: ${opciones.pacienteNombre} ${opciones.pacienteApellido}`, margen, cursorY);
    cursorY += 16;

    if (opciones.pacienteDni) {
      doc.text(`DNI: ${opciones.pacienteDni}`, margen, cursorY);
      cursorY += 16;
    }

    if (opciones.especialidadSeleccionada) {
      doc.text(`Especialidad seleccionada: ${opciones.especialidadSeleccionada}`, margen, cursorY);
      cursorY += 16;
    }

    doc.text(`Fecha de emisión: ${this.formatearFecha(new Date())}`, margen, cursorY);
    cursorY += 24;

    autoTable(doc, {
      startY: cursorY,
      head: [['#', 'Fecha', 'Profesional', 'Detalles de la atención']],
      body: opciones.historias.map((historia, indice) => [
        `${indice + 1}`,
        `${this.formatearFecha(historia.fechaAtencion)}\n${this.formatearHora(historia.fechaAtencion)}`,
        `${historia.especialistaNombre} ${historia.especialistaApellido}\n${historia.especialidad}`,
        this.formatearDetalleHistoria(historia)
      ]),
      styles: {
        cellPadding: 6,
        valign: 'top'
      },
      headStyles: {
        fillColor: [0, 173, 181],
        textColor: 255
      }
    });

    const nombreArchivo = `historia_clinica_${opciones.pacienteApellido?.toLowerCase() || 'paciente'}_${this.obtenerFechaArchivo()}.pdf`;
    doc.save(nombreArchivo);
  }

  async exportarDatasetExcel(nombreArchivo: string, nombreHoja: string, data: Record<string, any>[]): Promise<void> {
    if (!data || data.length === 0) {
      return;
    }

    await this.generarExcel(nombreArchivo, nombreHoja, data);
  }

  async exportarTablaPdf(opciones: {
    titulo: string;
    encabezados: string[];
    filas: (string | number)[][];
    descripcion?: string;
    nombreArchivo?: string;
  }): Promise<void> {
    if (!opciones.filas || opciones.filas.length === 0) {
      return;
    }

    const doc = new jsPDF();
    const margen = 40;
    let cursorY = 60;

    const logo = await this.obtenerLogoDataUrl();
    if (logo) {
      doc.addImage(logo, 'PNG', margen, cursorY - 20, 80, 40);
    }

    doc.setFontSize(18);
    doc.text(opciones.titulo, margen, cursorY + 30);
    cursorY += 60;

    doc.setFontSize(12);
    doc.text(`Fecha de emisión: ${this.formatearFecha(new Date())}`, margen, cursorY);
    cursorY += 18;

    if (opciones.descripcion) {
      doc.setFontSize(11);
      doc.text(opciones.descripcion, margen, cursorY);
      cursorY += 22;
    }

    autoTable(doc, {
      startY: cursorY,
      head: [opciones.encabezados],
      body: opciones.filas.map(fila => fila.map(valor => `${valor}`)),
      styles: {
        cellPadding: 6,
        valign: 'top'
      },
      headStyles: {
        fillColor: [0, 173, 181],
        textColor: 255
      }
    });

    const nombreArchivo = opciones.nombreArchivo ?? `reporte_${this.obtenerFechaArchivo()}.pdf`;
    doc.save(nombreArchivo);
  }

  private async generarExcel(nombreArchivo: string, nombreHoja: string, data: Record<string, any>[]): Promise<void> {
    const hoja = XLSX.utils.json_to_sheet(data);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);

    const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, `${nombreArchivo}.xlsx`);
  }

  private formatearFecha(valor: Date | string | any): string {
    if (!valor) {
      return '-';
    }

    const fecha = valor instanceof Date
      ? valor
      : typeof valor.seconds === 'number'
        ? new Date(valor.seconds * 1000)
        : new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return '-';
    }

    return fecha.toLocaleDateString('es-AR');
  }

  private formatearHora(valor: Date | string | any): string {
    if (!valor) {
      return '-';
    }

    const fecha = valor instanceof Date
      ? valor
      : typeof valor.seconds === 'number'
        ? new Date(valor.seconds * 1000)
        : new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return '-';
    }

    return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  private formatearDatosExtras(historia?: HistoriaClinica | null): string {
    if (!historia || !historia.datosDinamicos || historia.datosDinamicos.length === 0) {
      return '-';
    }

    return historia.datosDinamicos
      .map(dato => `${dato.clave}: ${dato.valor}`)
      .join(' | ');
  }

  private formatearDetalleHistoria(historia: HistoriaClinica): string {
    const lineas = [
      `Altura: ${historia.altura} cm`,
      `Peso: ${historia.peso} kg`,
      `Temperatura: ${historia.temperatura} °C`,
      `Presión: ${historia.presion}`
    ];

    if (historia.comentarioDiagnostico) {
      lineas.push(`Diagnóstico: ${historia.comentarioDiagnostico}`);
    }

    if (historia.datosDinamicos && historia.datosDinamicos.length > 0) {
      lineas.push(
        'Datos extra:',
        ...historia.datosDinamicos.map(dato => `- ${dato.clave}: ${dato.valor}`)
      );
    }

    return lineas.join('\n');
  }

  private obtenerFechaArchivo(): string {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}${mes}${dia}`;
  }

  private async obtenerLogoDataUrl(): Promise<string | null> {
    if (this.logoDataUrlCache !== undefined) {
      return this.logoDataUrlCache;
    }

    try {
      const respuesta = await fetch('logo.png');
      if (!respuesta.ok) {
        this.logoDataUrlCache = null;
        return null;
      }

      const blob = await respuesta.blob();
      this.logoDataUrlCache = await this.convertirBlobADataUrl(blob);
      return this.logoDataUrlCache;
    } catch (error) {
      console.warn('No se pudo cargar el logo para el PDF:', error);
      this.logoDataUrlCache = null;
      return null;
    }
  }

  private convertirBlobADataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onloadend = () => resolve(lector.result as string);
      lector.onerror = () => reject(lector.error);
      lector.readAsDataURL(blob);
    });
  }
}

