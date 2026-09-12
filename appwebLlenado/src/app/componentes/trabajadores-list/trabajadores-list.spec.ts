import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrabajadoresList } from './trabajadores-list';

describe('TrabajadoresList', () => {
  let component: TrabajadoresList;
  let fixture: ComponentFixture<TrabajadoresList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrabajadoresList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrabajadoresList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
