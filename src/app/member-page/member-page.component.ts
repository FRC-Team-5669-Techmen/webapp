import { Member, WebappBackendService, AccessLevel } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-member-page',
  templateUrl: './member-page.component.html',
  styleUrls: ['./member-page.component.scss']
})
export class MemberPageComponent implements OnInit {
  public member: Member = null;
  public submitting = false;
  teams: string[] = [];

  get AccessLevel() { // For *ngIfs
    return AccessLevel;
  }

  constructor(public backend: WebappBackendService, private router: Router, private route: ActivatedRoute) { 
    this.route.params.subscribe((params) => {
      this.member = null;
      this.ngOnInit();
    });
  }

  ngOnInit() {
    this.backend.getCurrentMemberAsync().then(() => {
      this.backend.getMember(this.route.snapshot.paramMap.get('id')).then((res) => this.member = res.body);
    });
    this.backend.getTeamList().then((teams) => {
      this.teams = teams.body;
    });
  }

  submit() {
    const id = this.member.id;
    this.submitting = true; // Show the user that their button click was processed.
    // Clean up data that should not be sent to be patched. Don't worry, future maintainer, this is also validated server-side.
    const data = Object.assign({}, this.member); // Otherwise data censoring will be shown to the user.
    data.emailAddress = undefined;
    data.id = undefined;
    if (this.backend.pollAccessLevel() !== AccessLevel.LEADER) {
      // Do not try to change leader-only things
      data.accessLevel = undefined;
      data.team = undefined;
    }
    this.backend.patchMember(id, data).then(() => this.router.navigate(['private', 'members']));
  }
}
