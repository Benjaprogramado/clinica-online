import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendienteAprobacion } from './pendiente-aprobacion';

describe('PendienteAprobacion', () => {
  let component: PendienteAprobacion;
  let fixture: ComponentFixture<PendienteAprobacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendienteAprobacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendienteAprobacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
