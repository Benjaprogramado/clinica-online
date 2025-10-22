import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  User,
  authState,
  updateProfile
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Usuario, TipoUsuario } from '../models/user.model';
import { NotificationService } from './notification';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  currentUser = signal<Usuario | null>(null);

  user$: Observable<Usuario | null> = authState(this.auth).pipe(
    switchMap((firebaseUser: User | null) => {
      if (!firebaseUser) {
        this.currentUser.set(null);
        return of(null);
      }

      const userDocRef = doc(this.firestore, `usuarios/${firebaseUser.uid}`);
      return from(getDoc(userDocRef)).pipe(
        map(docSnap => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as Usuario;
            this.currentUser.set(userData);
            return userData;
          }
          this.currentUser.set(null);
          return null;
        })
      );
    })
  );

  async registrarUsuario(
    email: string,
    password: string,
    userData: Partial<Usuario>
  ): Promise<Usuario> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${userData.nombre} ${userData.apellido}`,
        photoURL: userData.imagenPerfil
      });

      const nuevoUsuario: Usuario = {
        uid: user.uid,
        email: user.email!,
        nombre: userData.nombre!,
        apellido: userData.apellido!,
        edad: userData.edad!,
        dni: userData.dni!,
        role: userData.role!,
        imagenPerfil: userData.imagenPerfil!,
        imagenPerfil2: userData.imagenPerfil2,
        obraSocial: userData.obraSocial,
        especialidades: userData.especialidades,
        aprobado: userData.role === 'especialista' ? false : true,
        emailVerificado: false,
        activo: true,
        fechaRegistro: new Date(),
      };

      // Filtrar campos undefined para Firestore
      const dataToSave: any = {
        uid: nuevoUsuario.uid,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        edad: nuevoUsuario.edad,
        dni: nuevoUsuario.dni,
        role: nuevoUsuario.role,
        imagenPerfil: nuevoUsuario.imagenPerfil,
        aprobado: nuevoUsuario.aprobado,
        emailVerificado: nuevoUsuario.emailVerificado,
        activo: nuevoUsuario.activo,
        fechaRegistro: serverTimestamp()
      };

      // Agregar campos opcionales solo si existen
      if (userData.imagenPerfil2) {
        dataToSave.imagenPerfil2 = userData.imagenPerfil2;
      }
      if (userData.obraSocial) {
        dataToSave.obraSocial = userData.obraSocial;
      }
      if (userData.especialidades && userData.especialidades.length > 0) {
        dataToSave.especialidades = userData.especialidades;
      }

      const userDocRef = doc(this.firestore, `usuarios/${user.uid}`);
      await setDoc(userDocRef, dataToSave);

      await sendEmailVerification(user);

      await this.notificationService.showSuccess(
        'Registro exitoso',
        'Te hemos enviado un email de verificación.'
      );

      return nuevoUsuario;
    } catch (error: any) {
      let mensaje = 'Ocurrió un error al registrar el usuario.';
      
      if (error.code === 'auth/email-already-in-use') {
        mensaje = 'El email ya está registrado.';
      } else if (error.code === 'auth/weak-password') {
        mensaje = 'La contraseña debe tener al menos 6 caracteres.';
      }

      await this.notificationService.showError('Error de registro', mensaje);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      const user = userCredential.user;
      const userDocRef = doc(this.firestore, `usuarios/${user.uid}`);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado.');
      }

      const userData = userDoc.data() as Usuario;

      if (!userData.activo) {
        await this.logout();
        throw new Error('Tu cuenta ha sido deshabilitada.');
      }

      if (userData.role === 'paciente' && !user.emailVerified) {
        await this.logout();
        throw new Error('Debes verificar tu email.');
      }

      if (userData.role === 'especialista' && !userData.aprobado) {
        await this.logout();
        throw new Error('Tu cuenta está pendiente de aprobación.');
      }

      await updateDoc(userDocRef, {
        ultimoIngreso: serverTimestamp()
      });

      await this.notificationService.showSuccess(
        'Bienvenido',
        `Hola ${userData.nombre}!`
      );

      this.redirigirSegunRol(userData.role);
    } catch (error: any) {
      let mensaje = error.message || 'Error al iniciar sesión.';
      
      if (error.code === 'auth/invalid-credential') {
        mensaje = 'Email o contraseña incorrectos.';
      }

      await this.notificationService.showError('Error', mensaje);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  async actualizarImagenes(uid: string, imagenPerfil: string, imagenPerfil2?: string): Promise<void> {
    const userDocRef = doc(this.firestore, `usuarios/${uid}`);
    const updateData: any = { imagenPerfil };
    
    if (imagenPerfil2) {
      updateData.imagenPerfil2 = imagenPerfil2;
    }
    
    await updateDoc(userDocRef, updateData);
  }

  private redirigirSegunRol(role: TipoUsuario): void {
    switch (role) {
      case 'paciente':
        this.router.navigate(['/paciente/mis-turnos']);
        break;
      case 'especialista':
        this.router.navigate(['/especialista/mis-turnos']);
        break;
      case 'administrador':
        this.router.navigate(['/admin/usuarios']);
        break;
    }
  }

  async loginRapido(tipoUsuario: 'paciente' | 'especialista' | 'admin'): Promise<void> {
    const credenciales = {
      paciente: { email: 'paciente@test.com', password: 'Test123!' },
      especialista: { email: 'especialista@test.com', password: 'Test123!' },
      admin: { email: 'admin@test.com', password: 'Test123!' }
    };

    const cred = credenciales[tipoUsuario];
    await this.login(cred.email, cred.password);
  }


  
}
