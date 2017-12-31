import { AccessLevel, WebappBackendService } from '../webapp-backend.service';
import { YoloClientService } from '../yolo-client.service';
import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-page-guard',
  templateUrl: './page-guard.component.html',
  styleUrls: ['./page-guard.component.scss']
})
export class PageGuardComponent implements OnInit {
  @Input() loaded = true;
  @Input() loadingMessage = 'Loading...';
  @Input() accessLevel = AccessLevel.VISITOR;
  private loginInProgress = true;

  get AccessLevel() { // For *ngIfs
    return AccessLevel;
  }

  get show() {
    return this.loaded && this.backend.shouldHaveAccess(this.accessLevel);
  }

  constructor(private backend: WebappBackendService, private yolo: YoloClientService) { }

  ngOnInit() {
    const l = () => this.loginInProgress = false;
    const m = () => setTimeout(l, 1000);
    this.yolo.getCurrentLoginAttempt().then(m).catch(l);
    this.backend.getCurrentMemberAsync().then(l);
  }
}
