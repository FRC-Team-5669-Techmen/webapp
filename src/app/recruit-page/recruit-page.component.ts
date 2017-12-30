import { Member, WebappBackendService, AccessLevel } from '../webapp-backend.service';
import { YoloClientService, LoginDetails } from '../yolo-client.service';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatInput, MatCheckbox } from '@angular/material';

enum Status {
  Login,
  SeperateLogin,
  GettingData,
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
    wantsEmails: true,
    gradeLevel: null,
    preferredTeam: null,
    pastExperience: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
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

  constructor(private backend: WebappBackendService, private client: YoloClientService) { }

  ngOnInit() {
    this.client.hint().then((res: LoginDetails) => {
      const names = res.displayName.split(' ');
      this.data.firstName = names[0];
      this.data.lastName = names[1];
      this.data.emailAddress = res.id;
      this.status = Status.GettingData;
      setTimeout(() => this.signInCheckBox.nativeElement.click(), 100);
      // The webapp backend checks if a google account belongs to an FRC member whenever they log in. If this promise resolves, the backend
      // found the user's details, and we thus do not need to fill out the form anymore. This is also handily resolved when the user fills
      // in the form, so no need to duplicate this code in the submit() function.
      this.backend.getCurrentMemberAsync().then((member: Member) => {
        this.data = member;
        this.status = Status.Submitted;
        setTimeout(() => this.formCheckbox.nativeElement.click(), 100);
      });
    }).catch((err) => {
      // User has never logged into google before (at least not that we can tell.)
      if (err.type === 'noCredentialsAvailable') {
        this.status = Status.SeperateLogin;
      }
    });
  }

  submit(): void {
    this.status = Status.Submitting;
    this.backend.registerMember(this.data).then((res) => {
      if (res.ok) {
        this.backend.setMember(res.body);
      }
    });
  }
}
