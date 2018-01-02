import { TestBed, inject } from '@angular/core/testing';

import { PlatformIdService } from './platform-id.service';

describe('PlatformIdService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformIdService]
    });
  });

  it('should be created', inject([PlatformIdService], (service: PlatformIdService) => {
    expect(service).toBeTruthy();
  }));
});
