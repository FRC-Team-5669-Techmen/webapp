import { YoloClientService } from './yolo-client.service';
import { Component, ViewChild, OnInit, ElementRef, AfterContentInit, AfterViewInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'app';
  @ViewChild('header') header: ElementRef;
  @ViewChild('headerSpacing') headerSpacing: ElementRef;

  constructor (private yolo: YoloClientService, private reg: MatIconRegistry) {
    //reg.addSvgIconSet();
  }

  ngAfterViewInit() {
    const height = this.header.nativeElement.offsetHeight;
    this.headerSpacing.nativeElement.style.marginTop = height + 'px';
  }
}
