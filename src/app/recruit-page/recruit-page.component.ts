import { DiscordService } from '../discord.service';
import { Member, WebappBackendService, AccessLevel } from '../webapp-backend.service';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatInput, MatCheckbox } from '@angular/material';

enum Status {
  Login,
  GettingData,
  GettingParentData,
  Submitting,
  Submitted,
  OverlappingEmail
}

@Component({
  selector: 'app-recruit-page',
  templateUrl: './recruit-page.component.html',
  styleUrls: ['./recruit-page.component.scss']
})
export class RecruitPageComponent implements OnInit {
  status: Status = Status.Login;
  data: Member = {
    firstName: '',
    lastName: '',
    emailAddress: '',
    phone: '',
    sendEmails: true,
    gradeLevel: null,
    team: null,
    experience: '',
    shirtSize: null,
    parent: {
      firstName: '',
      lastName: '',
      emailAddress: '',
      phone: ''
    },
    accessLevel: AccessLevel.RESTRICTED
  };
  @ViewChild('signInCheckbox') signInCheckBox: ElementRef;
  @ViewChild('formCheckbox') formCheckbox: ElementRef;

  get Status() { // For ngIfs in the HTML file.
    return Status;
  }

  get console() {
    return console;
  }

  discordUrl = '';

  constructor(private backend: WebappBackendService, public discord: DiscordService) {
    this.discord.getAuthUrl().then((url) => {
      this.discordUrl = url;
    });
  }

  ngOnInit() {
    // TODO: this used to retrieve data from Google. Make it fill in with whatever we know about the user.
    this.backend.getCurrentMemberAsync().then((member) => {
      this.data.emailAddress = member.emailAddress;
      if (member.team !== null) { // The member has filled out their data. Skip to the last step.
        this.status = Status.Submitted;
      } else {
        this.status = Status.GettingData;
      }
    });
  }

  askForParentInfo(): void {
    this.status = Status.GettingParentData;
  }

  submit(): void {
    this.status = Status.Submitting;
    this.backend.registerMember(this.data).then((res) => {
      console.log(res);
      if (res.ok) {
        this.backend.setMember(res.body);
        this.status = Status.Submitted;
      }
    });
  }
}
