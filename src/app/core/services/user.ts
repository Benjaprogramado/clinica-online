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
  orderBy,
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
  private usuariosCollection: CollectionReference;

  constructor() {
    this.usuariosCollection = collection(this.firestore, 'usuarios');
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
    const q = query(
      this.usuariosCollection,
      orderBy('fechaRegistro', 'desc')
    );

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        return querySnapshot.docs.map(docSnap => {
          const data = docSnap.data() as Usuario;
          // Asegurar que el UID esté presente (puede venir del ID del documento o del campo)
          if (!data.uid) {
            data.uid = docSnap.id;
          }
          return data;
        });
      })
    );
  }

  getUsuariosPorRol(role: TipoUsuario): Observable<Usuario[]> {
    const q = query(
      this.usuariosCollection,
      where('role', '==', role),
      orderBy('fechaRegistro', 'desc')
    );

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        return querySnapshot.docs.map(docSnap => {
          const data = docSnap.data() as Usuario;
          // Asegurar que el UID esté presente
          if (!data.uid) {
            data.uid = docSnap.id;
          }
          return data;
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