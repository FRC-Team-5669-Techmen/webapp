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

  get AccessLevel() { // For *ngIfs
    return AccessLevel;
  }

  constructor(private backend: WebappBackendService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.backend.getMember(this.route.snapshot.paramMap.get('email')).then((res) => this.member = res.body);
  }

  submit() {
    const id = this.member.emailAddress;
    // Clean up data that should not be sent to be patched.
    this.member.emailAddress = undefined;
    if (this.backend.currentMember.accessLevel !== AccessLevel.ADMIN) {
      // Do not try to change admin-only things
      this.member.accessLevel = undefined;
      this.member.preferredTeam = undefined;
    }
    this.backend.patchMember(id, this.member);
    this.router.navigate(['private', 'members']);
  }
}
