import { WebappBackendService, DiscordRole, DiscordDefaultRoles, AccessLevel } from '../webapp-backend.service';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-roles-page',
  templateUrl: './roles-page.component.html',
  styleUrls: ['./roles-page.component.scss']
})
export class RolesPageComponent implements OnInit {
  roles: DiscordRole[];
  _defaultRoles: DiscordDefaultRoles = { restricted: null, member: null, leader: null, freshman: null, sophomore: null, junior: null,
    senior: null, alumni: null, faculty: null, other: null };
  public defaultRoles: any = {};

  // For templates
  get AccessLevel() {
    return AccessLevel;
  }

  constructor(private backend: WebappBackendService, private cdr: ChangeDetectorRef) {
    backend.getDiscordRoles().then((res) => {
      if (res.ok) {
        this.roles = res.body;
      } else {
        throw new Error('Could not retrieve Discord roles!');
      }
    });
    backend.getDiscordDefaultRoles().then((res) => {
      if (res.ok) {
        this._defaultRoles = res.body;
      } else {
        throw new Error('Could not retrieve Discord default roles!');
      }
      this.cdr.markForCheck();
    });
    for (const key of Object.keys(this._defaultRoles)) {
      Object.defineProperty(this.defaultRoles, key + 'Role', {
        set: (role) => {
          this._defaultRoles[key] = role;
          const patchData = {};
          patchData[key] = role;
          this.backend.patchDiscordDefaultRoles(patchData);
        },
        get: () => {
          return this._defaultRoles[key];
        }
      });
    }
  }

  ngOnInit() { }
}
