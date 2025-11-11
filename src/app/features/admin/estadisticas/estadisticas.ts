import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { TurnoService } from '../../../core/services/turno';
import { Turno } from '../../../core/models/turno.model';
import { LogIngreso, LogService } from '../../../core/services/log';
import { ReportService } from '../../../core/services/report';
import { NotificationService } from '../../../core/services/notification';
import { HoverElevateDirective } from '../../../shared/directives/hover-elevate.directive';
import { FocusBorderDirective } from '../../../shared/directives/focus-border.directive';
import { RoleBadgeDirective } from '../../../shared/directives/role-badge.directive';
import { NombreCompletoPipe } from '../../../shared/pipes/nombre-completo.pipe';
import { FechaHoraPipe } from '../../../shared/pipes/fecha-hora.pipe';
import { PorcentajePipe } from '../../../shared/pipes/porcentaje.pipe';

interface DatasetItem {
  etiqueta: string;
  valor: number;
}

@Component({
  selector: 'app-estadisticas-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    HoverElevateDirective,
    FocusBorderDirective,
    RoleBadgeDirective,
    NombreCompletoPipe,
    FechaHoraPipe,
    PorcentajePipe
  ],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.scss'
})
export class EstadisticasAdminComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private logService = inject(LogService);
  private reportService = inject(ReportService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  turnos = signal<Turno[]>([]);
  logs = signal<LogIngreso[]>([]);

  fechaFiltroDesde = signal<string>(this.formatearFechaInput(this.obtenerFechaHaceDias(30)));
  fechaFiltroHasta = signal<string>(this.formatearFechaInput(new Date()));

  totalTurnos = signal(0);
  turnosRealizados = signal(0);
  turnosPendientes = signal(0);
  promedioTurnosDia = signal(0);

  private datasetEspecialidad: DatasetItem[] = [];
  private datasetTurnosPorDia: DatasetItem[] = [];
  private datasetTurnosMedicoSolicitados: DatasetItem[] = [];
  private datasetTurnosMedicoRealizados: DatasetItem[] = [];

  barChartType: 'bar' = 'bar';
  lineChartType: 'line' = 'line';

  especialidadChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Turnos por especialidad',
        data: [],
        backgroundColor: '#00adb5',
        borderRadius: 6
      }
    ]
  };
  especialidadChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e2e8f0' } }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' } },
      y: { ticks: { color: '#94a3b8' } }
    }
  };

  diaChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Turnos por día',
        data: [],
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(0, 173, 181, 0.2)',
        borderColor: '#00adb5',
        pointBackgroundColor: '#00adb5'
      }
    ]
  };
  diaChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e2e8f0' } }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' } },
      y: { ticks: { color: '#94a3b8' } }
    }
  };

  medicoSolicitadosChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Turnos solicitados',
        data: [],
        backgroundColor: '#00f6ff',
        borderRadius: 6
      }
    ]
  };

  medicoRealizadosChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Turnos finalizados',
        data: [],
        backgroundColor: '#4ade80',
        borderRadius: 6
      }
    ]
  };

  medicoChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e2e8f0' } }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' } },
      y: { ticks: { color: '#94a3b8' } }
    }
  };

  ngOnInit(): void {
    this.turnoService.getAllTurnos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(turnos => {
        this.turnos.set(turnos);
        this.actualizarMetricas();
        this.actualizarGraficos();
      });

    this.logService.obtenerLogs(20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(logs => this.logs.set(logs));
  }

  actualizarGraficos(): void {
    this.actualizarTurnosPorEspecialidad();
    this.actualizarTurnosPorDia();
    this.actualizarTurnosPorMedico();
  }

  onCambiarRangoFechas(): void {
    this.actualizarTurnosPorMedico();
  }

  async descargarEspecialidadExcel(): Promise<void> {
    if (!this.datasetEspecialidad.length) {
      await this.notificationService.showInfo('Sin datos', 'No hay datos de turnos por especialidad para exportar.');
      return;
    }

    await this.reportService.exportarDatasetExcel(
      `turnos_especialidad_${this.obtenerFechaArchivo()}`,
      'Turnos por especialidad',
      this.datasetEspecialidad.map(item => ({
        Especialidad: item.etiqueta,
        Turnos: item.valor
      }))
    );
    await this.notificationService.showSuccess('Descarga iniciada', 'El Excel con turnos por especialidad se generó correctamente.');
  }

  async descargarEspecialidadPdf(): Promise<void> {
    if (!this.datasetEspecialidad.length) {
      await this.notificationService.showInfo('Sin datos', 'No hay datos de turnos por especialidad para exportar.');
      return;
    }

    await this.reportService.exportarTablaPdf({
      titulo: 'Turnos por Especialidad',
      encabezados: ['Especialidad', 'Cantidad de turnos'],
      filas: this.datasetEspecialidad.map(item => [item.etiqueta, item.valor]),
      descripcion: 'Detalle de turnos agrupados por especialidad.'
    });
  }

  async descargarTurnosDiaExcel(): Promise<void> {
    if (!this.datasetTurnosPorDia.length) {
      await this.notificationService.showInfo('Sin datos', 'No hay registros de turnos por día.');
      return;
    }

    await this.reportService.exportarDatasetExcel(
      `turnos_por_dia_${this.obtenerFechaArchivo()}`,
      'Turnos por día',
      this.datasetTurnosPorDia.map(item => ({
        Fecha: item.etiqueta,
        Turnos: item.valor
      }))
    );
    await this.notificationService.showSuccess('Descarga iniciada', 'El Excel con turnos por día se generó correctamente.');
  }

  async descargarTurnosDiaPdf(): Promise<void> {
    if (!this.datasetTurnosPorDia.length) {
      await this.notificationService.showInfo('Sin datos', 'No hay registros de turnos por día.');
      return;
    }

    await this.reportService.exportarTablaPdf({
      titulo: 'Turnos por Día',
      encabezados: ['Fecha', 'Turnos'],
      filas: this.datasetTurnosPorDia.map(item => [item.etiqueta, item.valor]),
      descripcion: 'Cantidad de turnos registrados en cada fecha.'
    });
  }

  async descargarTurnosMedicoExcel(): Promise<void> {
    if (!this.datasetTurnosMedicoSolicitados.length) {
      await this.notificationService.showInfo('Sin datos', 'No hay registros de turnos solicitados en el rango seleccionado.');
      return;
    }

    await this.reportService.exportarDatasetExcel(
      `turnos_medico_${this.obtenerFechaArchivo()}`,
      'Turnos solicitados por médico',
      this.datasetTurnosMedicoSolicitados.map(item => ({
        Médico: item.etiqueta,
        'Turnos solicitados': item.valor
      }))
    );
    await this.notificationService.showSuccess('Descarga iniciada', 'El Excel con turnos solicitados por médico se generó correctamente.');
  }

  async descargarTurnosMedicoPdf(): Promise<void> {
    if (!this.datasetTurnosMedicoSolicitados.length) {
      await this.notificationService.showInfo('Sin datos', 'No hay registros de turnos solicitados en el rango seleccionado.');
      return;
    }

    await this.reportService.exportarTablaPdf({
      titulo: 'Turnos solicitados por médico',
      encabezados: ['Médico', 'Turnos solicitados'],
      filas: this.datasetTurnosMedicoSolicitados.map(item => [item.etiqueta, item.valor]),
      descripcion: `Rango seleccionado: ${this.fechaFiltroDesde()} al ${this.fechaFiltroHasta()}`
    });
  }

  async descargarTurnosRealizadosExcel(): Promise<void> {
    if (!this.datasetTurnosMedicoRealizados.length) {
      await this.notificationService.showInfo('Sin datos', 'No hay registros de turnos finalizados en el rango seleccionado.');
      return;
    }

    await this.reportService.exportarDatasetExcel(
      `turnos_finalizados_medico_${this.obtenerFechaArchivo()}`,
      'Turnos finalizados por médico',
      this.datasetTurnosMedicoRealizados.map(item => ({
        Médico: item.etiqueta,
        'Turnos finalizados': item.valor
      }))
    );
    await this.notificationService.showSuccess('Descarga iniciada', 'El Excel con turnos finalizados por médico se generó correctamente.');
  }

  async descargarTurnosRealizadosPdf(): Promise<void> {
    if (!this.datasetTurnosMedicoRealizados.length) {
      await this.notificationService.showInfo('Sin datos', 'No hay registros de turnos finalizados en el rango seleccionado.');
      return;
    }

    await this.reportService.exportarTablaPdf({
      titulo: 'Turnos finalizados por médico',
      encabezados: ['Médico', 'Turnos finalizados'],
      filas: this.datasetTurnosMedicoRealizados.map(item => [item.etiqueta, item.valor]),
      descripcion: `Rango seleccionado: ${this.fechaFiltroDesde()} al ${this.fechaFiltroHasta()}`
    });
  }

  private actualizarMetricas(): void {
    const turnos = this.turnos();
    this.totalTurnos.set(turnos.length);
    this.turnosRealizados.set(turnos.filter(t => t.estado === 'realizado').length);
    this.turnosPendientes.set(turnos.filter(t => t.estado === 'pendiente').length);

    const diasUnicos = new Set<string>();
    turnos.forEach(turno => {
      const fecha = new Date(turno.fecha);
      diasUnicos.add(this.formatearFechaClave(fecha));
    });

    const promedio = diasUnicos.size === 0 ? 0 : turnos.length / diasUnicos.size;
    this.promedioTurnosDia.set(Number.isNaN(promedio) ? 0 : promedio);
  }

  private actualizarTurnosPorEspecialidad(): void {
    const conteo = new Map<string, number>();
    this.turnos().forEach(turno => {
      const especialidad = turno.especialidad || 'Sin especialidad';
      conteo.set(especialidad, (conteo.get(especialidad) ?? 0) + 1);
    });

    const labels = Array.from(conteo.keys());
    const values = Array.from(conteo.values());

    this.datasetEspecialidad = labels.map((etiqueta, idx) => ({
      etiqueta,
      valor: values[idx]
    }));

    this.especialidadChartData = {
      ...this.especialidadChartData,
      labels,
      datasets: this.especialidadChartData.datasets.map(dataset => ({
        ...dataset,
        data: values
      }))
    };
  }

  private actualizarTurnosPorDia(): void {
    const conteo = new Map<string, number>();
    this.turnos().forEach(turno => {
      const fecha = this.formatearFechaClave(new Date(turno.fecha));
      conteo.set(fecha, (conteo.get(fecha) ?? 0) + 1);
    });

    const labels = Array.from(conteo.keys()).sort((a, b) => {
      const [diaA, mesA, anioA] = a.split('/').map(Number);
      const [diaB, mesB, anioB] = b.split('/').map(Number);
      return new Date(anioA, mesA - 1, diaA).getTime() - new Date(anioB, mesB - 1, diaB).getTime();
    });
    const values = labels.map(label => conteo.get(label) ?? 0);

    this.datasetTurnosPorDia = labels.map((etiqueta, idx) => ({
      etiqueta,
      valor: values[idx]
    }));

    this.diaChartData = {
      ...this.diaChartData,
      labels,
      datasets: this.diaChartData.datasets.map(dataset => ({
        ...dataset,
        data: values
      }))
    };
  }

  private actualizarTurnosPorMedico(): void {
    const rango = this.obtenerRangoFechasSeleccionado();
    const turnosRango = this.turnos().filter(turno => {
      const fechaTurno = new Date(turno.fecha);
      return fechaTurno >= rango.desde && fechaTurno <= rango.hasta;
    });

    const solicitadosConteo = new Map<string, number>();
    turnosRango.forEach(turno => {
      const medico = `${turno.especialistaNombre} ${turno.especialistaApellido}`;
      solicitadosConteo.set(medico, (solicitadosConteo.get(medico) ?? 0) + 1);
    });

    const realizadosConteo = new Map<string, number>();
    turnosRango
      .filter(turno => turno.estado === 'realizado')
      .forEach(turno => {
        const medico = `${turno.especialistaNombre} ${turno.especialistaApellido}`;
        realizadosConteo.set(medico, (realizadosConteo.get(medico) ?? 0) + 1);
      });

    const labelsSolicitados = Array.from(solicitadosConteo.keys());
    const valoresSolicitados = labelsSolicitados.map(label => solicitadosConteo.get(label) ?? 0);

    this.datasetTurnosMedicoSolicitados = labelsSolicitados.map((etiqueta, idx) => ({
      etiqueta,
      valor: valoresSolicitados[idx]
    }));

    const labelsRealizados = Array.from(realizadosConteo.keys());
    const valoresRealizados = labelsRealizados.map(label => realizadosConteo.get(label) ?? 0);

    this.datasetTurnosMedicoRealizados = labelsRealizados.map((etiqueta, idx) => ({
      etiqueta,
      valor: valoresRealizados[idx]
    }));

    this.medicoSolicitadosChartData = {
      ...this.medicoSolicitadosChartData,
      labels: labelsSolicitados,
      datasets: this.medicoSolicitadosChartData.datasets.map(dataset => ({
        ...dataset,
        data: valoresSolicitados
      }))
    };

    this.medicoRealizadosChartData = {
      ...this.medicoRealizadosChartData,
      labels: labelsRealizados,
      datasets: this.medicoRealizadosChartData.datasets.map(dataset => ({
        ...dataset,
        data: valoresRealizados
      }))
    };
  }

  private obtenerRangoFechasSeleccionado(): { desde: Date; hasta: Date } {
    const desde = new Date(this.fechaFiltroDesde() || this.formatearFechaInput(this.obtenerFechaHaceDias(30)));
    const hasta = new Date(this.fechaFiltroHasta() || this.formatearFechaInput(new Date()));
    desde.setHours(0, 0, 0, 0);
    hasta.setHours(23, 59, 59, 999);
    return { desde, hasta };
  }

  private formatearFechaClave(fecha: Date): string {
    return fecha.toLocaleDateString('es-AR');
  }

  private formatearFechaInput(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private obtenerFechaHaceDias(dias: number): Date {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha;
  }

  private obtenerFechaArchivo(): string {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

