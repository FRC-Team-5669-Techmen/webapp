import { YoloClientService } from './yolo-client.service';
import { Component, ViewChild, OnInit, ElementRef, AfterContentInit, AfterViewInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'app';
  @ViewChild('header') header: ElementRef;
  @ViewChild('headerSpacing') headerSpacing: ElementRef;

  constructor (private yolo: YoloClientService, private router: Router, private reg: MatIconRegistry, private domSanitizer: DomSanitizer) {
    reg.addSvgIconSet(domSanitizer.bypassSecurityTrustResourceUrl('/assets/mdi.svg'));
  }

  ngAfterViewInit() {
    const height = this.header.nativeElement.offsetHeight;
    this.headerSpacing.nativeElement.style.marginTop = height + 'px';
  }
}
