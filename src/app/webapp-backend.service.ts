import { YoloClientService, LoginDetails } from './yolo-client.service';
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
  private currentMember: Promise<Member>; // Resolved whenever someone logs in and is a valid user.
  private resolveCurrentMember: (e: Member) => void;
  private polledCurrentMember: Member = null; // Used for things that only need member details if they are logged in right now, not later.

  constructor(private client: HttpClient, private yolo: YoloClientService) {
    this.currentMember = new Promise<Member>((resolve, reject) => {
      this.resolveCurrentMember = (e: Member) => {
        this.polledCurrentMember = e;
        resolve(e);
      };
    });
    // If a google account is successfully logged in, check if they are an FRC member.
    this.yolo.getLoginDetailsAsync().then((details: LoginDetails) => {
      this.loginExistingUser();
    });
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
      headers['authorization'] = 'Bearer ' + this.yolo.pollLoginDetails().idToken;
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

  // If the user has logged in with their google account, checks if the google account belongs to a valid FRC member. If so, it saves their
  // information, resolves the currentMember promise, etc.
  private loginExistingUser() {
    if (this.yolo.isLoggedIn) {
      this.getMember(this.yolo.pollLoginDetails().id).then((res2) => {
        if (res2.ok) {
          this.resolveCurrentMember(res2.body);
        }
      });
    }
  }

  // Returns a promise that is resolved whenever a valid user logs in.
  // (Asynchronous)
  getCurrentMemberAsync(): Promise<Member> {
    return this.currentMember;
  }

  // Returns the currently logged in member, if there is one. If not, returns null.
  // (Synchronous non-blocking)
  pollCurrentMember(): Member {
    return this.polledCurrentMember;
  }

  // This is ONLY used for when a new user registers.
  setMember(member: Member) {
    this.resolveCurrentMember(member);
  }

  // Returns the access level of the current logged in member. If no valid user is currently logged in, returns AccessLevel.VISITOR.
  // (Synchronous non-blocking)
  pollAccessLevel(): AccessLevel {
    if (this.polledCurrentMember) {
      return this.polledCurrentMember.accessLevel;
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
