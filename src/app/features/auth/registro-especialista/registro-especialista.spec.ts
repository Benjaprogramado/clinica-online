import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroEspecialista } from './registro-especialista';

describe('RegistroEspecialista', () => {
  let component: RegistroEspecialista;
  let fixture: ComponentFixture<RegistroEspecialista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroEspecialista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroEspecialista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
