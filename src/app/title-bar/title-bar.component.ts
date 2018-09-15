import { PlatformIdService } from '../platform-id.service';
import { WebappBackendService, AccessLevel } from '../webapp-backend.service';
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
    {text: 'My Profile', url: '/private/members/me'}
  ];
  leaderButtons = [
    {text: 'Part Requests [WIP]', url: '/private/parts'},
    {text: 'Roles', url: '/private/roles'}
  ];

  get AccessLevel() { // for *ngIf s
    return AccessLevel;
  }

  constructor(public backend: WebappBackendService, public platformId: PlatformIdService) { }

  ngOnInit() {
  }
}
