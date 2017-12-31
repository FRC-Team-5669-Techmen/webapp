import { WebappBackendService } from '../webapp-backend.service';
import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-contact-info',
  templateUrl: './contact-info.component.html',
  styleUrls: ['./contact-info.component.scss']
})
export class ContactInfoComponent implements OnInit {
  @Input() showMembersLink = false;
  private team = '';

  constructor(private backend: WebappBackendService) {
    backend.getCurrentMemberAsync().then((member) => {
      this.team = member.preferredTeam;
    });
  }

  ngOnInit() {
  }
}
