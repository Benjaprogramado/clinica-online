import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verificar-email.html',
  styleUrl: './verificar-email.scss'
})
export class VerificarEmail implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  estado = '';
  cargando = true;

  async ngOnInit(): Promise<void> {
    try {
      const user = this.auth.currentUser;
      
      if (!user) {
        this.estado = 'error';
        this.cargando = false;
        this.router.navigate(['/login'], { 
          queryParams: { error: 'Usuario no autenticado.' } 
        });
        return;
      }

      // Verificar si el email ya está verificado
      await user.reload();
      
      if (user.emailVerified) {
        // Actualizar el campo emailVerificado en Firestore
        const userDocRef = doc(this.firestore, `usuarios/${user.uid}`);
        await updateDoc(userDocRef, {
          emailVerificado: true
        });

        this.estado = 'exito';
        this.cargando = false;
        
        // Redirigir según el rol
        setTimeout(() => {
          const userData = localStorage.getItem('userRole');
          if (userData) {
            this.router.navigate(['/pendiente-aprobacion']);
          } else {
            this.router.navigate(['/login']);
          }
        }, 3000);
      } else {
        this.estado = 'no-verificado';
        this.cargando = false;
      }
    } catch (error: any) {
      console.error('Error verificando email:', error);
      this.estado = 'error';
      this.cargando = false;
    }
  }
}
