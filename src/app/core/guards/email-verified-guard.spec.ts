import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { emailVerifiedGuard } from './email-verified-guard';

describe('emailVerifiedGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => emailVerifiedGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
