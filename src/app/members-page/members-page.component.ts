import { WebappBackendService, Member, AccessLevel } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-members-page',
  templateUrl: './members-page.component.html',
  styleUrls: ['./members-page.component.scss']
})
export class MembersPageComponent implements OnInit {
  public members: Array<Member> = null;

  get AccessLevel() { // For *ngIfs
    return AccessLevel;
  }

  matchesAccessLevelLambda(target: AccessLevel): (e: Member & {profilePic: string}) => boolean {
    return (e: Member & {profilePic: string}) => (e.accessLevel === target);
  }

  constructor(public backend: WebappBackendService) { }

  ngOnInit() {
    this.backend.getCurrentMemberAsync().then(() => {
      const level = this.backend.pollAccessLevel();
      if (this.backend.shouldHaveAccess(AccessLevel.MEMBER)) {
        this.backend.getMemberList().then((list) => {
          this.members = list.body;
        });
      }
    });
  }
}
