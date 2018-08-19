import { PlatformIdService } from '../platform-id.service';
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
    {text: 'Info', url: '/private/contact'},
    {text: 'Members', url: '/private/members'},
    {text: 'Part Requests', url: '/private/parts'},
    {text: 'Roles', url: '/private/roles'}
  ];

  constructor(public backend: WebappBackendService, public platformId: PlatformIdService) { }

  ngOnInit() {
  }
}
