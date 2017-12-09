import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';

@Injectable()
export class WebappBackendService {
  constructor(private client: HttpClient) { }

  private post(url, data, callback) {
    const request = this.client.post(url, data, {
      observe: 'response',
      headers: { 'content-type': 'application/json'},
      responseType: 'json'
    });
    request.subscribe((res) => {
      callback(res);
    }, (err) => {
      callback(err);
    });
  }

  registerMember(memberData, callback) {
    this.post('/api/v1/registerMember', memberData, callback);
  }
}
