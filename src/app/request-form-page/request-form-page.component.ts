import { WebappBackendService, PartRequest, AccessLevel, PartRequestStatus } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

@Component({
  selector: 'app-request-form-page',
  templateUrl: './request-form-page.component.html',
  styleUrls: ['./request-form-page.component.scss']
})
export class RequestFormPageComponent implements OnInit {
  public included: Array<string> = [];
  public requests: Array<PartRequest> = null;
  public downloading = false;

  get AccessLevel() {
    return AccessLevel;
  }

  get downloadUrl() {
    return this.backend.getPartRequestFormDownloadUrl(this.included);
  }

  constructor(private backend: WebappBackendService, private route: ActivatedRoute) { }

  remove(id: string) {
    this.included = this.included.filter((e) => e !== id);
  }

  include(id: string) {
    this.included.push(id);
  }

  getIncludedRequests() {
    return this.requests.filter((e) => {
      return (this.included.indexOf(e.requestId) !== -1);
    });
  }

  getAllPendingRequests() {
    return this.requests.filter((e) => {
      return (e.status === PartRequestStatus.PENDING) && (this.included.indexOf(e.requestId) === -1);
    });
  }

  setDownload() {
    this.downloading = true;
    setTimeout(() => this.downloading = false, 5000);
  }

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    if (params.include) {
      this.included = params.include.split(',');
    }
    this.backend.getCurrentMemberAsync().then((member) => {
      this.backend.getPartRequests().then((res) => {
        if (res.ok) {
          this.requests = res.body;
        }
      });
    });
  }
}
