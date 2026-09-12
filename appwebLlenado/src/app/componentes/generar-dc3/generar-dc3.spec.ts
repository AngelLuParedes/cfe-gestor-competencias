import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerarDc3 } from './generar-dc3';

describe('GenerarDc3', () => {
  let component: GenerarDc3;
  let fixture: ComponentFixture<GenerarDc3>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerarDc3]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenerarDc3);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
