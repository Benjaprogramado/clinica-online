import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './core/services/loading';
import { NavbarComponent } from './shared/components/navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    
    <main class="main-content">
      <router-outlet></router-outlet>
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
}