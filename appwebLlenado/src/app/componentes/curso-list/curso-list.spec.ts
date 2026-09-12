import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CursoList } from './curso-list';

describe('CursoList', () => {
  let component: CursoList;
  let fixture: ComponentFixture<CursoList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CursoList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CursoList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
