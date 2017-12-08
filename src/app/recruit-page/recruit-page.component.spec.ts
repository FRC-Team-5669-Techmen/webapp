import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RecruitPageComponent } from './recruit-page.component';

describe('RecruitPageComponent', () => {
  let component: RecruitPageComponent;
  let fixture: ComponentFixture<RecruitPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RecruitPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RecruitPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
