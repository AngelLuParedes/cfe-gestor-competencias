import { TestBed } from '@angular/core/testing';

import { Constancias } from './constancias';

describe('Constancias', () => {
  let service: Constancias;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Constancias);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
