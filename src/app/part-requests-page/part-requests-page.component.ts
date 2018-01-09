import { AccessLevel, PartRequest, WebappBackendService, PartRequestStatus } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-part-requests-page',
  templateUrl: './part-requests-page.component.html',
  styleUrls: ['./part-requests-page.component.scss']
})
export class PartRequestsPageComponent implements OnInit {
  requests: Array<PartRequest> = null;

  get AccessLevel() { // For *ngIfs
    return AccessLevel;
  }

  get PartRequestStatus() {
    return PartRequestStatus;
  }

  constructor(private backend: WebappBackendService) { }

  ngOnInit() {
    this.requests = [];
    this.backend.getCurrentMemberAsync().then((member) => {
      this.backend.getPartRequests().then((res) => {
        if (res.ok) {
          this.requests = res.body;
          console.log(this.requests);
        }
      });
    });
  }

  getAllRequestsWithStatus(status: PartRequestStatus) {
    return this.requests.filter((e) => e.status === status);
  }

  getAllRequestsByCurrentMember() {
    return this.requests.filter((e) => {
      return (e.requestedBy === this.backend.pollCurrentMember().emailAddress) && (e.status === this.PartRequestStatus.PENDING);
    });
  }

  canEdit(request: PartRequest) {
    const m = this.backend.pollCurrentMember();
    return ((request.requestedBy === m.emailAddress) || (m.accessLevel === AccessLevel.LEADER))
        && (request.status === PartRequestStatus.PENDING);
  }
}
