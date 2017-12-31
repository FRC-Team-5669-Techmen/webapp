import { Member, WebappBackendService, AccessLevel } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-member-page',
  templateUrl: './member-page.component.html',
  styleUrls: ['./member-page.component.scss']
})
export class MemberPageComponent implements OnInit {
  private member: Member = null;
  private submitting = false;

  get AccessLevel() { // For *ngIfs
    return AccessLevel;
  }

  constructor(private backend: WebappBackendService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.backend.getCurrentMemberAsync().then(() => {
      this.backend.getMember(this.route.snapshot.paramMap.get('email')).then((res) => this.member = res.body);
    });
  }

  submit() {
    const id = this.member.emailAddress;
    this.submitting = true; // Show the user that their button click was processed.
    // Clean up data that should not be sent to be patched.
    const data = Object.assign({}, this.member); // Otherwise data censoring will be shown to the user.
    data.emailAddress = undefined;
    if (this.backend.pollAccessLevel() !== AccessLevel.LEADER) {
      // Do not try to change leader-only things
      data.accessLevel = undefined;
      data.preferredTeam = undefined;
    }
    this.backend.patchMember(id, data).then(() => this.router.navigate(['private', 'members']));
  }
}
