import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VigenciaCursos } from './vigencia-cursos';

describe('VigenciaCursos', () => {
  let component: VigenciaCursos;
  let fixture: ComponentFixture<VigenciaCursos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VigenciaCursos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VigenciaCursos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
