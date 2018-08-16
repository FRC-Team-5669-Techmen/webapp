import { AccessLevel, WebappBackendService } from '../webapp-backend.service';
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
  public loginInProgress = true;

  get AccessLevel() { // For *ngIfs
    return AccessLevel;
  }

  get show() {
    return this.loaded && this.backend.shouldHaveAccess(this.accessLevel);
  }

  constructor(public backend: WebappBackendService) { }

  ngOnInit() {
    const l = () => this.loginInProgress = false;
    const m = () => setTimeout(l, 1000);
    // this.yolo.getCurrentLoginAttempt().then(m).catch(l); // TODO: Replace this.
    this.backend.getCurrentMemberAsync().then(l);
  }
}
