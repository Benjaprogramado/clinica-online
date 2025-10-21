import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class LandingComponent {
  features = [
    {
      icon: 'pi pi-calendar',
      titulo: 'Turnos Online',
      descripcion: 'Reserva tus consultas de forma rápida y sencilla.'
    },
    {
      icon: 'pi pi-file-edit',
      titulo: 'Historia Clínica Digital',
      descripcion: 'Accede a tu historial médico completo.'
    },
    {
      icon: 'pi pi-users',
      titulo: 'Profesionales Calificados',
      descripcion: 'Especialistas en diversas áreas médicas.'
    },
    {
      icon: 'pi pi-mobile',
      titulo: 'Acceso 24/7',
      descripcion: 'Gestiona tus turnos desde cualquier dispositivo.'
    }
  ];
}