import { Component, OnInit } from '@angular/core';
import { DiscordRole, WebappBackendService, AccessLevel, GoogleDriveRole, DriveFile } from '../webapp-backend.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-role-page',
  templateUrl: './role-page.component.html',
  styleUrls: ['./role-page.component.scss']
})
export class RolePageComponent implements OnInit {
  public role: DiscordRole = null;
  public drives: DriveFile[] = [];
  public submitting = false;

  get AccessLevel() { // For the template
    return AccessLevel;
  }

  get GoogleDriveRole() {
    return GoogleDriveRole;
  }

  constructor(public backend: WebappBackendService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.backend.getCurrentMemberAsync().then(() => {
      this.backend.getDiscordRole(this.route.snapshot.paramMap.get('id')).then((res) => {
        this.role = res.body;
      });
      this.backend.getDrives().then((res) => {
        this.drives = res.body;
      });
    });
  }

  submit() {
    this.submitting = true;
    this.backend.patchDiscordRole(this.role.id, {
      minimumAccessLevel: this.role.minimumAccessLevel,
      googleDriveAccess: this.role.googleDriveAccess
    }).then(() => {
      this.router.navigate(['private', 'roles']);
    });
  }

  addDrive(selectEvent: any) {
    selectEvent.source.value = null;
    this.role.googleDriveAccess.push({
      fileId: selectEvent.value,
      access: GoogleDriveRole.VIEW
    });
  }

  removeDrive(index: number) {
    this.role.googleDriveAccess.splice(index, 1);
  }
}
