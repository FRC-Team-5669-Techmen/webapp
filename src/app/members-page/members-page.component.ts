import { WebappBackendService, Member } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-members-page',
  templateUrl: './members-page.component.html',
  styleUrls: ['./members-page.component.scss']
})
export class MembersPageComponent implements OnInit {
  private members: Array<Member & {profilePic: string}> = null;

  constructor(private backend: WebappBackendService) { }

  ngOnInit() {
    this.backend.getMemberList().then((list) => {
      let i = 0;
      this.members = [];
      for (const member of list.body) {
        const mmember = <Member & {profilePic: string}> member;
        mmember.profilePic = '/assets/default-profile.jpg';
        this.members.push(mmember);
        this.backend.getUserProfilePicture(member.emailAddress).then((url) => {
          this.members[i].profilePic = url;
        });
        i++;
      }
    });
  }
}
