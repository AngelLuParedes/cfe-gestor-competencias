import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CursoForm } from './curso-form';

describe('CursoForm', () => {
  let component: CursoForm;
  let fixture: ComponentFixture<CursoForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CursoForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CursoForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
