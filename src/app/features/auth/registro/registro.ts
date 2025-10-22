import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RegistroPacienteComponent } from '../registro-paciente/registro-paciente';
import { RegistroEspecialistaComponent } from '../registro-especialista/registro-especialista';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, RouterModule, RegistroPacienteComponent, RegistroEspecialistaComponent],
  templateUrl: './registro.html',
  styleUrl: './registro.scss'
})
export class RegistroComponent {
  tipoSeleccionado: 'paciente' | 'especialista' | null = null;

  seleccionarTipo(tipo: 'paciente' | 'especialista'): void {
    this.tipoSeleccionado = tipo;
  }
}
