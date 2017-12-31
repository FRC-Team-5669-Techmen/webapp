import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactInfoPageComponent } from './contact-info-page.component';

describe('ContactInfoPageComponent', () => {
  let component: ContactInfoPageComponent;
  let fixture: ComponentFixture<ContactInfoPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ContactInfoPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactInfoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
