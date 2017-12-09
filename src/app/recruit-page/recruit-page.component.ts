import { WebappBackendService } from '../webapp-backend.service';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatInput } from '@angular/material';

enum Status {
  GettingData = 0,
  Submitting = 1,
  Submitted = 2,
  OverlappingEmail = 3
}

@Component({
  selector: 'app-recruit-page',
  templateUrl: './recruit-page.component.html',
  styleUrls: ['./recruit-page.component.scss']
})
export class RecruitPageComponent implements OnInit {
  status: Status = Status.GettingData;
  data = {
    firstName: '',
    lastName: '',
    emailAddress: '',
    wantsEmails: false,
    gradeLevel: null,
    preferredTeam: null,
    pastExperience: ''
  };
  @ViewChild('lastName') lastName: ElementRef;

  get Status() { // For ngIfs in the HTML file.
    return Status;
  }

  get console() {
    return console;
  }

  constructor(private backend: WebappBackendService) { }

  ngOnInit() {
  }

  submit(): void {
    this.status = Status.Submitting;
    this.backend.registerMember(this.data, (res) => {
      if (res.ok) {
        this.status = Status.Submitted;
      } else {
        this.status = Status.OverlappingEmail;
      }
    });
  }
}
