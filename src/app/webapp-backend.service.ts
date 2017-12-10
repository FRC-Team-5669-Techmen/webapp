import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';

export interface Member {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  wantsEmails?: boolean;
  gradeLevel?: string;
  preferredTeam?: string;
  pastExperience?: string;
}

@Injectable()
export class WebappBackendService {
  constructor(private client: HttpClient) { }

  private post<T>(url: string, data: any): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      const request = this.client.post<T>(url, data, {
        observe: 'response',
        headers: { 'content-type': 'application/json'},
        responseType: 'json'
      });
      request.subscribe(resolve, reject);
    });
  }

  private get<T>(url: string): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      this.client.get<T>(url, {observe: 'response'}).subscribe(resolve, reject);
    });
  }

  registerMember(memberData: Member): Promise<HttpResponse<Member>> {
    return this.post<Member>('/api/v1/registerMember', memberData);
  }

  findMemberByEmail(email: string): Promise<HttpResponse<Member>> {
    return this.get<Member>('/api/v1/members/findByEmail/' + email);
  }
}
