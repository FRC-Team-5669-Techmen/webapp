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
    this.client.getLogin().then((res: LoginDetails) => {
      const names = res.displayName.split(' ');
      this.data.firstName = names[0];
      this.data.lastName = names[1];
      this.data.emailAddress = res.id;
      this.status = Status.GettingData;
      setTimeout(() => this.signInCheckBox.nativeElement.click(), 100);
      // The only way to check if we are registered is to attempt to get our information.
      this.backend.getMember(this.data.emailAddress).then((res2) => {
        if (res2.ok) { // If we were found in the database.
          this.status = Status.OverlappingEmail;
          setTimeout(() => this.formCheckbox.nativeElement.click(), 100);
          // Now that we know we are registered, retrieve our own data.
          this.data = res2.body;
          this.backend.currentMember = res2.body;
        }
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
      this.status = Status.Submitted;
      setTimeout(() => this.formCheckbox.nativeElement.click(), 100);
        this.backend.currentMember = res.body;
    });
  }
}
