import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PartRequestPageComponent } from './part-request-page.component';

describe('PartRequestPageComponent', () => {
  let component: PartRequestPageComponent;
  let fixture: ComponentFixture<PartRequestPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PartRequestPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PartRequestPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
