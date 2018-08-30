import { WebappBackendService, PartRequest, AccessLevel, PartVendor, PartRequestStatus, Partial } from '../webapp-backend.service';
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-part-request-page',
  templateUrl: './part-request-page.component.html',
  styleUrls: ['./part-request-page.component.scss']
})
export class PartRequestPageComponent implements OnInit {
  vendors: Array<PartVendor>;
  partRequest: Partial<PartRequest>;
  isNew = false;
  canEdit = false;
  isLeader = false;
  submitting = false;
  submitter = null;

  get AccessLevel() {
    return AccessLevel;
  }

  get PartRequestStatus() {
    return PartRequestStatus;
  }

  constructor(public backend: WebappBackendService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.backend.getVendors().then((res) => this.vendors = res.body);
    this.backend.getCurrentMemberAsync().then((member) => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id === 'create') {
        this.isNew = true;
        this.partRequest = {
          vendorName: '',
          itemDescription: '',
          itemNumber: '',
          taxExempt: false,
          quantity: 1,
          price: null
        };
      } else {
        this.isNew = false;
        this.backend.getPartRequest(id).then((res) => {
          if (res.ok) {
            this.submitter = null;
            this.isLeader = (member.accessLevel === AccessLevel.LEADER);
            this.canEdit = (res.body.requestedBy === member.id) || this.isLeader;
            this.partRequest = res.body;
            this.backend.getMember(this.partRequest.requestedBy).then((res2) => {
              this.submitter = res2.body.firstName + ' ' + res2.body.lastName;
            });
          }
        });
      }
    });
  }

  validatePrice(element) {
    element.target.value = this.partRequest.price.toFixed(2);
  }

  submit() {
    this.submitting = true;
    const redirect = () => this.router.navigate(['private', 'parts']);
    if (this.isNew) {
      this.backend.createPartRequest(this.partRequest).then(redirect);
    } else {
      this.backend.patchPartRequest(this.partRequest.requestId, this.partRequest).then(redirect);
    }
  }
}
