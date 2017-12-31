import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PageGuardComponent } from './page-guard.component';

describe('PageGuardComponent', () => {
  let component: PageGuardComponent;
  let fixture: ComponentFixture<PageGuardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PageGuardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PageGuardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
