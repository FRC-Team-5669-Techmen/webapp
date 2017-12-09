import { TestBed, inject } from '@angular/core/testing';

import { GClientService } from './g-client.service';

describe('GClientService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GClientService]
    });
  });

  it('should be created', inject([GClientService], (service: GClientService) => {
    expect(service).toBeTruthy();
  }));
});
