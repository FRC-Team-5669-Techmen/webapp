import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SlideshowBackgroundComponent } from './slideshow-background.component';

describe('SlideshowBackgroundComponent', () => {
  let component: SlideshowBackgroundComponent;
  let fixture: ComponentFixture<SlideshowBackgroundComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SlideshowBackgroundComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SlideshowBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
