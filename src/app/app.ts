import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate, query, group } from '@angular/animations';
import { LoadingService } from './core/services/loading';
import { NavbarComponent } from './shared/components/navbar/navbar';

const routeAnimations = trigger('routeAnimations', [
  transition('* <=> fade', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        width: '100%',
        top: 0,
        left: 0
      })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0 }),
        animate('280ms ease-out', style({ opacity: 1 }))
      ], { optional: true })
    ])
  ]),
  transition('* <=> slideUp', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        width: '100%',
        top: 0,
        left: 0
      })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('260ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'translateY(60px)' }),
        animate('360ms cubic-bezier(0.22, 0.82, 0.25, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ], { optional: true })
    ])
  ])
]);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  animations: [routeAnimations],
  template: `
    <app-navbar></app-navbar>
    
    <main class="main-content" [@routeAnimations]="prepareRoute(outlet)">
      <router-outlet #outlet="outlet"></router-outlet>
    </main>
    
    <div class="loading-overlay" *ngIf="isLoading()">
      <div class="spinner-container">
        <div class="spinner-border text-primary"></div>
        <p>Cargando...</p>
      </div>
    </div>
  `,
  styles: [`
    .main-content {
      min-height: calc(100vh - 70px);
      padding-top: 70px;
      position: relative;
      overflow: hidden;
    }
    
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      
      .spinner-container {
        text-align: center;
        
        .spinner-border {
          width: 4rem;
          height: 4rem;
        }
        
        p {
          margin-top: 1rem;
          color: #00adb5;
        }
      }
    }
  `]
})
export class AppComponent {
  private loadingService = inject(LoadingService);
  isLoading = this.loadingService.isLoading;

  prepareRoute(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] || 'fade';
  }
}