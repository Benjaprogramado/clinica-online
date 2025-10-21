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
        return querySnapshot.docs.map(doc => doc.data() as Usuario);
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
        return querySnapshot.docs.map(doc => doc.data() as Usuario);
      })
    );
  }

  async aprobarEspecialista(uid: string): Promise<void> {
    const userDocRef = doc(this.firestore, `usuarios/${uid}`);
    await updateDoc(userDocRef, {
      aprobado: true,
      fechaModificacion: serverTimestamp()
    });
  }

  async habilitarUsuario(uid: string): Promise<void> {
    const userDocRef = doc(this.firestore, `usuarios/${uid}`);
    await updateDoc(userDocRef, {
      activo: true,
      fechaModificacion: serverTimestamp()
    });
  }

  async deshabilitarUsuario(uid: string): Promise<void> {
    const userDocRef = doc(this.firestore, `usuarios/${uid}`);
    await updateDoc(userDocRef, {
      activo: false,
      fechaModificacion: serverTimestamp()
    });
  }
}