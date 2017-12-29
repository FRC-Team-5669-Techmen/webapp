import { YoloClientService } from './yolo-client.service';
import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';

export enum AccessLevel {
  VISITOR = 'visitor',
  RESTRICTED = 'restricted',
  MEMBER = 'member',
  ADMIN = 'admin'
}

export enum GradeLevel {
  FRESHMAN = 'Freshman',
  SOPHOMORE = 'Sophomore',
  JUNIOR = 'Junior',
  SENIOR = 'Senior'
}

export interface Member {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  wantsEmails?: boolean;
  phone?: string;
  gradeLevel?: GradeLevel | '';
  preferredTeam?: string;
  pastExperience?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  accessLevel?: AccessLevel;
}

@Injectable()
export class WebappBackendService {
  public currentMember: Member = null;

  constructor(private client: HttpClient, private yolo: YoloClientService) {
    yolo.yoloObj.then((obj) => this.loginExistingUser());
  }

  private createOptions(contentType?: string): {
    headers: {
      'content-type'?: string,
      authorization?: string
    },
    observe: 'response',
    responseType: 'json'
  } {
    const headers = {};
    if (contentType) {
      headers['content-type'] = contentType;
    }
    if (this.yolo.isLoggedIn) {
      // idToken is already safe to put in a header, no b64llshit necessary.
      headers['authorization'] = 'Bearer ' + this.yolo.loginDetails.idToken;
    }
    return {
      observe: 'response',
      headers: headers,
      responseType: 'json'
    };
  }

  private patch<T>(url: string, data: any): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      this.client.patch<T>(url, data, this.createOptions('application/merge-patch+json'))
        .subscribe(resolve, reject);
    });
  }

  private post<T>(url: string, data: any): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      this.client.post<T>(url, data, this.createOptions('application/json'))
        .subscribe(resolve, reject);
    });
  }

  private get<T>(url: string): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      this.client.get<T>(url, this.createOptions())
        .subscribe(resolve, reject);
    });
  }

  loginExistingUser() {
    this.yolo.getLogin(true).then((res) => {
      this.getMember(res.id).then((res2) => {
        if (res2.ok) {
          this.currentMember = res2.body;
        }
      });
    });
  }

  getAccessLevel(): AccessLevel {
    if (this.currentMember) {
      return this.currentMember.accessLevel;
    } else {
      return AccessLevel.VISITOR;
    }
  }

  registerMember(memberData: Member): Promise<HttpResponse<Member>> {
    return this.post<Member>('/api/v1/members/register', memberData);
  }

  patchMember(email: string, memberData: Member): Promise<HttpResponse<Member>> {
    return this.patch<Member>('/api/v1/members/' + email, memberData);
  }

  getMember(email: string): Promise<HttpResponse<Member>> {
    return this.get<Member>('/api/v1/members/' + email);
  }

  getMemberList(): Promise<HttpResponse<Array<Member>>> {
    return this.get<Array<Member>>('/api/v1/members/list');
  }
}
