import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  CollectionReference,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Usuario, TipoUsuario } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);
  
  private get usuariosCollection(): CollectionReference {
    return collection(this.firestore, 'usuarios');
  }

  getUsuarioById(uid: string): Observable<Usuario | null> {
    const userDocRef = doc(this.firestore, `usuarios/${uid}`);
    return from(getDoc(userDocRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return docSnap.data() as Usuario;
        }
        return null;
      })
    );
  }

  getTodosLosUsuarios(): Observable<Usuario[]> {
    // Ordenar en memoria para evitar problemas con índices
    return from(getDocs(this.usuariosCollection)).pipe(
      map(querySnapshot => {
        const usuarios = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data() as Usuario;
          // Asegurar que el UID esté presente (puede venir del ID del documento o del campo)
          if (!data.uid) {
            data.uid = docSnap.id;
          }
          return data;
        });
        
        // Ordenar en memoria por fechaRegistro (más reciente primero)
        return usuarios.sort((a, b) => {
          const fechaA = a.fechaRegistro instanceof Date 
            ? a.fechaRegistro.getTime() 
            : (a.fechaRegistro as any)?.seconds * 1000 || 0;
          const fechaB = b.fechaRegistro instanceof Date 
            ? b.fechaRegistro.getTime() 
            : (b.fechaRegistro as any)?.seconds * 1000 || 0;
          return fechaB - fechaA; // Descendente
        });
      })
    );
  }

  getUsuariosPorRol(role: TipoUsuario): Observable<Usuario[]> {
    // No usar orderBy con where para evitar necesidad de índice compuesto
    // Ordenaremos en memoria después
    const q = query(
      this.usuariosCollection,
      where('role', '==', role)
    );

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        const usuarios = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data() as Usuario;
          // Asegurar que el UID esté presente
          if (!data.uid) {
            data.uid = docSnap.id;
          }
          return data;
        });
        
        // Ordenar en memoria por fechaRegistro (más reciente primero)
        return usuarios.sort((a, b) => {
          const fechaA = a.fechaRegistro instanceof Date 
            ? a.fechaRegistro.getTime() 
            : (a.fechaRegistro as any)?.seconds * 1000 || 0;
          const fechaB = b.fechaRegistro instanceof Date 
            ? b.fechaRegistro.getTime() 
            : (b.fechaRegistro as any)?.seconds * 1000 || 0;
          return fechaB - fechaA; // Descendente
        });
      })
    );
  }

  async aprobarEspecialista(uid: string): Promise<void> {
    // Intentar primero con el UID como ID del documento
    let userDocRef = doc(this.firestore, `usuarios/${uid}`);
    let userDoc = await getDoc(userDocRef);
    
    // Si no existe, buscar por email usando el UID (si el UID está en el campo email)
    // O buscar por el campo uid en los documentos
    if (!userDoc.exists()) {
      const q = query(
        this.usuariosCollection,
        where('uid', '==', uid)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        userDocRef = doc(this.firestore, `usuarios/${docSnap.id}`);
      } else {
        throw new Error('Usuario no encontrado');
      }
    }
    
    await updateDoc(userDocRef, {
      aprobado: true,
      fechaModificacion: serverTimestamp()
    });
  }

  async habilitarUsuario(uid: string): Promise<void> {
    // Intentar primero con el UID como ID del documento
    let userDocRef = doc(this.firestore, `usuarios/${uid}`);
    let userDoc = await getDoc(userDocRef);
    
    // Si no existe, buscar por el campo uid en los documentos
    if (!userDoc.exists()) {
      const q = query(
        this.usuariosCollection,
        where('uid', '==', uid)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        userDocRef = doc(this.firestore, `usuarios/${docSnap.id}`);
      } else {
        throw new Error('Usuario no encontrado');
      }
    }
    
    await updateDoc(userDocRef, {
      activo: true,
      fechaModificacion: serverTimestamp()
    });
  }

  async deshabilitarUsuario(uid: string): Promise<void> {
    // Intentar primero con el UID como ID del documento
    let userDocRef = doc(this.firestore, `usuarios/${uid}`);
    let userDoc = await getDoc(userDocRef);
    
    // Si no existe, buscar por el campo uid en los documentos
    if (!userDoc.exists()) {
      const q = query(
        this.usuariosCollection,
        where('uid', '==', uid)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        userDocRef = doc(this.firestore, `usuarios/${docSnap.id}`);
      } else {
        throw new Error('Usuario no encontrado');
      }
    }
    
    await updateDoc(userDocRef, {
      activo: false,
      fechaModificacion: serverTimestamp()
    });
  }
}