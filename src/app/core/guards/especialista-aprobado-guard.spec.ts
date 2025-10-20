import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { especialistaAprobadoGuard } from './especialista-aprobado-guard';

describe('especialistaAprobadoGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => especialistaAprobadoGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
