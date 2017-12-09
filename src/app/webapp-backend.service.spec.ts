import { TestBed, inject } from '@angular/core/testing';

import { WebappBackendService } from './webapp-backend.service';

describe('WebappBackendService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WebappBackendService]
    });
  });

  it('should be created', inject([WebappBackendService], (service: WebappBackendService) => {
    expect(service).toBeTruthy();
  }));
});
