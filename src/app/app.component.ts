import { Component, ViewChild, OnInit, ElementRef, AfterContentInit, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'app';
  @ViewChild('header') header: ElementRef;
  @ViewChild('headerSpacing') headerSpacing: ElementRef;

  ngAfterViewInit() {
    const height = this.header.nativeElement.offsetHeight;
    this.headerSpacing.nativeElement.style.marginTop = height + 'px';
  }
}
