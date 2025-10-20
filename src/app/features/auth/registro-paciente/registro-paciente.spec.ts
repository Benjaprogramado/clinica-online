import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroPaciente } from './registro-paciente';

describe('RegistroPaciente', () => {
  let component: RegistroPaciente;
  let fixture: ComponentFixture<RegistroPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroPaciente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroPaciente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
