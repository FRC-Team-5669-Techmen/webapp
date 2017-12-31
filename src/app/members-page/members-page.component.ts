import { WebappBackendService, Member, AccessLevel } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-members-page',
  templateUrl: './members-page.component.html',
  styleUrls: ['./members-page.component.scss']
})
export class MembersPageComponent implements OnInit {
  private members: Array<Member> = null;
  private access = true;

  get AccessLevel() { // For *ngIfs
    return AccessLevel;
  }

  matchesAccessLevelLambda(target: AccessLevel): (e: Member & {profilePic: string}) => boolean {
    return (e: Member & {profilePic: string}) => (e.accessLevel === target);
  }

  constructor(private backend: WebappBackendService) { }

  ngOnInit() {
    this.backend.getCurrentMemberAsync().then(() => {
      const level = this.backend.pollAccessLevel();
      if ((level === AccessLevel.VISITOR) || (level === AccessLevel.RESTRICTED)) {
        this.access = false;
        return;
      }
      this.backend.getMemberList().then((list) => {
        this.members = list.body;
      });
    });
  }
}
