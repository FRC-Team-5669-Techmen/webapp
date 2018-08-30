import { WebappBackendService, DiscordRole, DiscordDefaultRoles, AccessLevel } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-roles-page',
  templateUrl: './roles-page.component.html',
  styleUrls: ['./roles-page.component.scss']
})
export class RolesPageComponent implements OnInit {
  roles: DiscordRole[];
  defaultRoles: DiscordDefaultRoles = { restricted: null, member: null };

  // For templates
  get AccessLevel() {
    return AccessLevel;
  }

  constructor(private backend: WebappBackendService) {
    backend.getDiscordRoles().then((res) => {
      if (res.ok) {
        this.roles = res.body;
      } else {
        throw new Error('Could not retrieve Discord roles!');
      }
    });
    backend.getDiscordDefaultRoles().then((res) => {
      if (res.ok) {
        this.defaultRoles = res.body;
      } else {
        throw new Error('Could not retrieve Discord default roles!');
      }
    });
  }

  ngOnInit() { }

  get restrictedRole() {
    return this.defaultRoles.restricted;
  }

  set restrictedRole(role) {
    this.defaultRoles.restricted = role;
    this.backend.patchDiscordDefaultRoles({ restricted: role });
  }

  get memberRole() {
    return this.defaultRoles.member;
  }

  set memberRole(role) {
    this.defaultRoles.member = role;
    this.backend.patchDiscordDefaultRoles({ member: role });
  }
}
