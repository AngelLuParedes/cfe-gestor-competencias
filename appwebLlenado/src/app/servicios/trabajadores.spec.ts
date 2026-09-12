import { TestBed } from '@angular/core/testing';

import { Trabajadores } from './trabajadores';

describe('Trabajadores', () => {
  let service: Trabajadores;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Trabajadores);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
