import { TestBed } from '@angular/core/testing';

import { Vigencia } from './vigencia';

describe('Vigencia', () => {
  let service: Vigencia;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Vigencia);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
