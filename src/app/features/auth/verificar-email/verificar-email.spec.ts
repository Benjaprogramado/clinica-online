import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificarEmail } from './verificar-email';

describe('VerificarEmail', () => {
  let component: VerificarEmail;
  let fixture: ComponentFixture<VerificarEmail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificarEmail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerificarEmail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
