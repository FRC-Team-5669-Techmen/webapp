import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { CookieService } from 'ngx-cookie';

export enum AccessLevel {
  VISITOR = 'visitor',
  RESTRICTED = 'restricted',
  MEMBER = 'member',
  LEADER = 'leader'
}

export enum GradeLevel {
  FRESHMAN = 'Freshman',
  SOPHOMORE = 'Sophomore',
  JUNIOR = 'Junior',
  SENIOR = 'Senior'
}

export enum ShirtSize {
  SMALL = 'S',
  MEDIUM = 'M',
  LARGE = 'L',
  XLARGE = 'XL'
}

export interface Parent {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  phone?: string;
}

export interface Member {
  id?: string;
  firstName?: string;
  lastName?: string;
  shirtSize?: ShirtSize;
  emailAddress?: string;
  sendEmails?: boolean;
  phone?: string;
  gradeLevel?: GradeLevel | '';
  team?: string;
  experience?: string;
  parent?: Parent;
  accessLevel?: AccessLevel;
}

export interface PartVendor {
  vendorName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
}

export enum PartRequestStatus {
  PENDING = 'Pending',
  ORDERED = 'Order Submitted',
  RESOLVED = 'Parts Received'
}

export interface PartRequest {
  requestId?: string;
  vendorName?: string;
  itemDescription?: string;
  itemNumber?: string;
  taxExempt?: boolean;
  quantity?: number;
  price?: number;
  requestedBy?: string;
  dateRequested?: string;
  status?: PartRequestStatus;
}

const quantifiedAccessLevels = {
  visitor: 0,
  restricted: 1,
  member: 2,
  leader: 3
};

export function quantifyAccessLevel(level: AccessLevel) {
  return quantifiedAccessLevels[level];
}

interface TokenResponse {
  token: string;
}

interface BackendHTTPOptions {
  headers: {
    'content-type'?: string,
    authorization: string
  };
  observe: 'response';
  responseType: 'json';
}

@Injectable()
export class WebappBackendService {
  private currentMember: Promise<Member>; // Resolved whenever someone logs in and is a valid user.
  private resolveCurrentMember: (e: Member) => void;
  private polledCurrentMember: Member = null; // Used for things that only need member details if they are logged in right now, not later.
  private sessionToken: Promise<string>; // Resolved when one is loaded from a cookie or a new one is created by the server.

  constructor(private client: HttpClient, private cookieService: CookieService) {
    this.currentMember = new Promise<Member>((resolve, reject) => {
      this.resolveCurrentMember = (e: Member) => {
        this.polledCurrentMember = e;
        resolve(e);
      };
    });

    // Get a session token to identify this session.
    this.sessionToken = new Promise<string>((resolve, reject) => {
      if (this.cookieService.get('sessionToken')) {
        const oldToken = this.cookieService.get('sessionToken');
        // Check if the current session token is valid.
        this.client.get<{
          valid: boolean,
          recommendedToken: string
        }>(
          '/api/v1/session/isValid',
          { headers: { authorization: 'Bearer ' + oldToken } }
        ).subscribe((data) => {
          // If old token is invalid, this will be a new token. If the old one was valid, it will be the same token.
          this.cookieService.put('sessionToken', data.recommendedToken);
          resolve(data.recommendedToken);
        });
      } else {
        this.get<TokenResponse>('/api/v1/session/new').then((res) => {
          if (res.ok) {
            this.cookieService.put('sessionToken', res.body.token);
            resolve(res.body.token);
          } else {
            throw new Error('Error retrieving new session token!');
          }
        });
      }
    });
    this.sessionToken.then((token) => this.loginExistingUser());
  }

  private createOptions(contentType?: string): Promise<BackendHTTPOptions> {
    const headers = { authorization: '' };
    if (contentType) {
      headers['content-type'] = contentType;
    }
    return this.sessionToken.then((token) => {
      headers.authorization = 'Bearer ' + token;
      return {
        observe: <'response'> 'response',
        headers: headers,
        responseType: <'json'> 'json'
      };
    });
  }

  private patch<T>(url: string, data: any): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      this.createOptions('application/merge-patch+json').then((options) => {
        this.client.patch<T>(url, data, options).subscribe(resolve, reject);
      });
    });
  }

  private post<T>(url: string, data: any): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      this.createOptions('application/json').then((options) => {
        this.client.post<T>(url, data, options).subscribe(resolve, reject);
      });
    });
  }

  private get<T>(url: string): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      this.createOptions().then((options) => {
        const it = this.client.get<T>(url, options);
        it.subscribe(resolve, reject);
      });
    });
  }

  // If the user has logged in with their google account, checks if the google account belongs to a valid FRC member. If so, it saves their
  // information, resolves the currentMember promise, etc.
  private loginExistingUser() {
    this.get<Member>('/api/v1/members/me').then((res) => {
      if (res.ok && res.body) {
        this.resolveCurrentMember(res.body);
      }
    }, (err) => 0); // 404 if there is no associated user.
  }

  getSessionToken(): Promise<string> {
    return this.sessionToken;
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

  shouldHaveAccess(minimumRequired: AccessLevel) {
    return quantifyAccessLevel(this.pollAccessLevel()) >= quantifyAccessLevel(minimumRequired);
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

  getVendors(): Promise<HttpResponse<Array<PartVendor>>> {
    return this.get<Array<PartVendor>>('/api/v1/vendors/list');
  }

  getVendor(name: string): Promise<HttpResponse<PartVendor>> {
    return this.get<PartVendor>('/api/v1/vendors/' + name);
  }

  getPartRequests(): Promise<HttpResponse<Array<PartRequest>>> {
    return this.get<Array<PartRequest>>('/api/v1/partRequests/list');
  }

  getPartRequest(id: string): Promise<HttpResponse<PartRequest>> {
    return this.get<PartRequest>('/api/v1/partRequests/' + id);
  }

  createPartRequest(partRequest: PartRequest): Promise<HttpResponse<PartRequest>> {
    return this.post<PartRequest>('/api/v1/partRequests/create', partRequest);
  }

  patchPartRequest(id: string, requestData: PartRequest): Promise<HttpResponse<PartRequest>> {
    return this.patch<PartRequest>('/api/v1/partRequests/' + id, requestData);
  }

  getPartRequestFormDownloadUrl(partRequestIds: Array<string>): string {
    let url = '/api/v1/partRequests/generateForm?include=';
    url += encodeURIComponent(partRequestIds.join(','));
    url += '&authorization=';
    url += encodeURIComponent(''); // TODO: promise stuff and session token
    return url;
  }
}
