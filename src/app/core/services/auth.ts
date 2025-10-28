import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  User,
  authState,
  updateProfile,
  onAuthStateChanged
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
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

  constructor() {
    // Listen to auth state changes to sync emailVerificado field in Firestore
    this.auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        let userDocRef = doc(this.firestore, `usuarios/${firebaseUser.uid}`);
        let userDoc = await getDoc(userDocRef);
        
        // Si no existe por UID, buscar por email
        if (!userDoc.exists() && firebaseUser.email) {
          const usersRef = collection(this.firestore, 'usuarios');
          const q = query(usersRef, where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            userDocRef = doc(this.firestore, `usuarios/${docSnap.id}`);
            userDoc = docSnap;
          }
        }
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as Usuario;
          // Only update if emailVerificado is false in Firestore
          if (!userData.emailVerificado) {
            await updateDoc(userDocRef, {
              emailVerificado: true
            });
          }
        }
      }
    });
  }

  user$: Observable<Usuario | null> = authState(this.auth).pipe(
    switchMap((firebaseUser: User | null) => {
      if (!firebaseUser) {
        this.currentUser.set(null);
        return of(null);
      }

      // Intentar buscar por UID primero
      const userDocRef = doc(this.firestore, `usuarios/${firebaseUser.uid}`);
      return from(getDoc(userDocRef)).pipe(
        switchMap(docSnap => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as Usuario;
            this.currentUser.set(userData);
            return of(userData);
          }
          
          // Si no existe, buscar por email
          if (firebaseUser.email) {
            const usersRef = collection(this.firestore, 'usuarios');
            const q = query(usersRef, where('email', '==', firebaseUser.email));
            return from(getDocs(q)).pipe(
              map(querySnapshot => {
                if (!querySnapshot.empty) {
                  const userData = querySnapshot.docs[0].data() as Usuario;
                  this.currentUser.set(userData);
                  return userData;
                }
                this.currentUser.set(null);
                return null;
              })
            );
          }
          
          this.currentUser.set(null);
          return of(null);
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
        'Te hemos enviado un email de verificación. Verifica tu cuenta antes de iniciar sesión.'
      );

      // Esperar un momento para que el usuario vea el mensaje
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Cerrar sesión y redirigir al login
      await this.logout();
      this.router.navigate(['/login']);

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

  /**
   * Método para crear usuarios desde el panel de administración
   * No cierra sesión ni redirige, solo crea el usuario
   */
  async crearUsuarioDesdeAdmin(
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
        photoURL: userData.imagenPerfil || ''
      });

      // Para administradores, aprobado es true por defecto
      const aprobado = userData.role === 'especialista' ? (userData.aprobado ?? false) : true;

      const nuevoUsuario: Usuario = {
        uid: user.uid,
        email: user.email!,
        nombre: userData.nombre!,
        apellido: userData.apellido!,
        edad: userData.edad!,
        dni: userData.dni!,
        role: userData.role!,
        imagenPerfil: userData.imagenPerfil || '',
        imagenPerfil2: userData.imagenPerfil2,
        obraSocial: userData.obraSocial,
        especialidades: userData.especialidades,
        aprobado: aprobado,
        emailVerificado: false, // El usuario deberá verificar su email
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

      // Enviar email de verificación
      await sendEmailVerification(user);

      return nuevoUsuario;
    } catch (error: any) {
      let mensaje = 'Ocurrió un error al crear el usuario.';
      
      if (error.code === 'auth/email-already-in-use') {
        mensaje = 'El email ya está registrado.';
      } else if (error.code === 'auth/weak-password') {
        mensaje = 'La contraseña debe tener al menos 6 caracteres.';
      }

      await this.notificationService.showError('Error al crear usuario', mensaje);
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
      console.log('UID del usuario en Firebase Auth:', user.uid);
      console.log('Email del usuario:', user.email);
      
      // Recargar el usuario para obtener el estado más reciente de emailVerified
      await user.reload();
      
      // Intentar buscar por UID primero
      let userDocRef = doc(this.firestore, `usuarios/${user.uid}`);
      let userDoc = await getDoc(userDocRef);

      // Si no existe por UID, buscar por email en la colección
      if (!userDoc.exists()) {
        console.log('Usuario no encontrado por UID, buscando por email...');
        const usersRef = collection(this.firestore, 'usuarios');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Usuario no encontrado.');
        }
        
        // Tomar el primer documento encontrado
        const docSnap = querySnapshot.docs[0];
        userDocRef = doc(this.firestore, `usuarios/${docSnap.id}`);
        userDoc = docSnap;
        console.log('Usuario encontrado por email, documento ID:', docSnap.id);
      }

      const userData = userDoc.data() as Usuario;

      if (!userData.activo) {
        await this.logout();
        throw new Error('Tu cuenta ha sido deshabilitada.');
      }

      // Sincronizar emailVerificado con Firebase Auth
      if (user.emailVerified && !userData.emailVerificado) {
        await updateDoc(userDocRef, {
          emailVerificado: true
        });
        userData.emailVerificado = true;
      }
      
      // También sincronizar en sentido contrario: si Firestore dice true pero Auth dice false,
      // esto puede ser útil para desarrollo/usuarios de prueba
      if (userData.emailVerificado && !user.emailVerified) {
        // No podemos cambiar user.emailVerified directamente, pero usamos el valor de Firestore
        // para permitir el login (verificado abajo)
      }
      
      // Debug temporal
      console.log('Email verificado en Firebase Auth:', user.emailVerified);
      console.log('Role del usuario:', userData.role);
      console.log('Email verificado en Firestore:', userData.emailVerificado);
      console.log('Aprobado:', userData.aprobado);
      
      // Verificar email para pacientes - aceptar si está verificado en Auth O en Firestore
      const emailVerificado = user.emailVerified || userData.emailVerificado === true;
      if (userData.role === 'paciente' && !emailVerificado) {
        await this.logout();
        throw new Error('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
      }

      // Verificar aprobación para especialistas (requieren aprobación del admin)
      if (userData.role === 'especialista') {
        // Para especialistas también aceptamos Firestore o Firebase Auth
        const emailVerificadoEspecialista = user.emailVerified || userData.emailVerificado === true;
        if (!emailVerificadoEspecialista) {
          await this.logout();
          throw new Error('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
        }
        
        if (!userData.aprobado) {
          await this.logout();
          throw new Error('Tu cuenta está pendiente de aprobación del administrador. Debes aguardar a que tu cuenta sea aprobada antes de poder iniciar sesión.');
        }
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
        // TODO: Implementar módulo de paciente
        // this.router.navigate(['/paciente/mis-turnos']);
        this.router.navigate(['/']);
        break;
      case 'especialista':
        // TODO: Implementar módulo de especialista
        // this.router.navigate(['/especialista/mis-turnos']);
        this.router.navigate(['/']);
        break;
      case 'administrador':
        this.router.navigate(['/admin/usuarios']);
        break;
    }
  }

  // Usuarios de prueba para accesos rápidos
  usuariosPrueba = {
    paciente1: { 
      email: 'paciente1@test.com', 
      password: 'Test123!',
      nombre: 'Juan',
      apellido: 'Pérez',
      imagenPerfil: 'https://via.placeholder.com/150?text=Paciente1'
    },
    paciente2: { 
      email: 'paciente2@test.com', 
      password: 'Test123!',
      nombre: 'María',
      apellido: 'García',
      imagenPerfil: 'https://via.placeholder.com/150?text=Paciente2'
    },
    paciente3: { 
      email: 'paciente3@test.com', 
      password: 'Test123!',
      nombre: 'Carlos',
      apellido: 'López',
      imagenPerfil: 'https://via.placeholder.com/150?text=Paciente3'
    },
    especialista1: { 
      email: 'especialista1@test.com', 
      password: 'Test123!',
      nombre: 'Dr. Ana',
      apellido: 'Martínez',
      imagenPerfil: 'https://via.placeholder.com/150?text=Especialista1'
    },
    especialista2: { 
      email: 'especialista2@test.com', 
      password: 'Test123!',
      nombre: 'Dr. Luis',
      apellido: 'Rodríguez',
      imagenPerfil: 'https://via.placeholder.com/150?text=Especialista2'
    },
    admin: { 
      email: 'admin@test.com', 
      password: 'Test123!',
      nombre: 'Admin',
      apellido: 'Sistema',
      imagenPerfil: 'https://via.placeholder.com/150?text=Admin'
    }
  } as const;

  async loginRapido(usuario: 'paciente1' | 'paciente2' | 'paciente3' | 'especialista1' | 'especialista2' | 'admin'): Promise<void> {
    const cred = this.usuariosPrueba[usuario];
    await this.login(cred.email, cred.password);
  }

  getUsuariosPrueba() {
    return this.usuariosPrueba;
  }

  // Obtener información actualizada de usuarios de prueba desde Firestore
  async getUsuariosPruebaConImagenes(): Promise<any> {
    // Asegurar que Firestore está disponible
    if (!this.firestore) {
      console.warn('Firestore no está disponible');
      return this.usuariosPrueba;
    }
    
    const usuariosActualizados: any = {};
    
    for (const key in this.usuariosPrueba) {
      const usuarioOriginal = this.usuariosPrueba[key as keyof typeof this.usuariosPrueba];
      usuariosActualizados[key] = { ...usuarioOriginal };
      
      try {
        // Buscar por email - usar collection y query con el firestore inyectado
        const usersRef = collection(this.firestore, 'usuarios');
        const q = query(usersRef, where('email', '==', usuarioOriginal.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data() as Usuario;
          
          // Actualizar con imagen real si existe
          if (userData.imagenPerfil && userData.imagenPerfil.trim() !== '') {
            usuariosActualizados[key].imagenPerfil = userData.imagenPerfil;
            if (key === 'admin') {
              console.log(`✅ Admin - Imagen cargada desde Firestore: ${userData.imagenPerfil.substring(0, 60)}...`);
            }
          }
          
          if (userData.nombre && userData.apellido) {
            usuariosActualizados[key].nombre = userData.nombre;
            usuariosActualizados[key].apellido = userData.apellido;
          }
        }
      } catch (error) {
        // Si falla, mantener los valores por defecto
        console.warn(`No se pudo obtener información del usuario ${usuarioOriginal.email}:`, error);
      }
    }
    
    return usuariosActualizados;
  }


  
}
