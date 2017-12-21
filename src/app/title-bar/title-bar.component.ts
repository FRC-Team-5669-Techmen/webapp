import { WebappBackendService } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.scss']
})
export class TitleBarComponent implements OnInit {
  signedOutButtons = [
    {text: 'Sign In / Sign Up', url: '/public/register'}
  ];
  signedInButtons = [
    {text: 'Request Parts', url: '/private/parts'},
    {text: 'Sign Out', url: '/private/logout'}
  ];

  constructor(private backend: WebappBackendService) { }

  ngOnInit() {
  }

}
