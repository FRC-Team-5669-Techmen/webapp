import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PartRequestsPageComponent } from './part-requests-page.component';

describe('PartRequestsPageComponent', () => {
  let component: PartRequestsPageComponent;
  let fixture: ComponentFixture<PartRequestsPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PartRequestsPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PartRequestsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
