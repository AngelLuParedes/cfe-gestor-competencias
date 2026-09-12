import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrabajadorForm } from './trabajador-form';

describe('TrabajadorForm', () => {
  let component: TrabajadorForm;
  let fixture: ComponentFixture<TrabajadorForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrabajadorForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrabajadorForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
