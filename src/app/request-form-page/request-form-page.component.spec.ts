import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestFormPageComponent } from './request-form-page.component';

describe('RequestFormPageComponent', () => {
  let component: RequestFormPageComponent;
  let fixture: ComponentFixture<RequestFormPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RequestFormPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestFormPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
