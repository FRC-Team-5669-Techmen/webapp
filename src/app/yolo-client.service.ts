import { Injectable } from '@angular/core';

const oAuthClientId = '1056552383797-n6uq3md5vml5k1jai947eh7v2pq8k958.apps.googleusercontent.com';

export type SupportedAuthMethod = 'https://accounts.google.com' | 'googleyolo://id-and-password';

export interface IdTokenProvider {
  uri: 'https://accounts.google.com';
  clientId: string;
}

export interface RetrieveSettings {
  supportedAuthMethods: Array<SupportedAuthMethod>;
  supportedIdTokenProviders: Array<IdTokenProvider>;
}

export interface LoginDetails {
  authDomain: string; // Site the user logged in from.
  authMethod: SupportedAuthMethod;
  displayName: string;
  id: string; // Email address.
  idToken: string; // Verifiable string belonging to the account. Changes for each new login.
                   // Details: https://developers.google.com/identity/sign-in/web/backend-auth
  profilePicture: string; // CDN URL for user's profile pic.
}

export interface YoloObj {
  retrieve: (settings: RetrieveSettings) => Promise<any>;
  hint: (settings: RetrieveSettings) => Promise<LoginDetails>;
  cancelLastOperation: () => void;
  disableAutoSignIn: () => Promise<null>;
}

@Injectable()
export class YoloClientService {
  yoloObj: Promise<YoloObj>;
  loginDetails: LoginDetails = null;

  constructor() {
    this.yoloObj = new Promise<YoloObj>((resolve, reject) => {
      window['onGoogleYoloLoad'] = (yoloObj: YoloObj) => {
        resolve(yoloObj);
      };
      const element = document.createElement('script');
      element.src = 'https://smartlock.google.com/client';
      element.type = 'text/javascript';
      document.getElementsByTagName('head')[0].appendChild(element);
    });
  }

  // Promise returns true if login is successful.
  retrieve(): Promise<LoginDetails> {
    return new Promise((resolve, reject) => {
      this.yoloObj.then((yolo) => {
        yolo.retrieve({
          supportedAuthMethods: ['https://accounts.google.com'],
          supportedIdTokenProviders: [{
            uri: 'https://accounts.google.com',
            clientId: oAuthClientId
          }]
        }).then((res: LoginDetails) => {
          this.loginDetails = res;
          resolve(res);
        }).catch(reject);
      });
    });
  }

  hint(): Promise<LoginDetails> {
    return new Promise((resolve, reject) => {
      this.yoloObj.then((yolo) => {
        yolo.hint({
          supportedAuthMethods: ['https://accounts.google.com'],
          supportedIdTokenProviders: [{
            uri: 'https://accounts.google.com',
            clientId: oAuthClientId
          }]
        }).then((res: LoginDetails) => {
          this.loginDetails = res;
          resolve(res);
        }).catch(reject);
      });
    });
  }

  get isLoggedIn(): boolean {
    return (this.loginDetails != null);
  }

  getLogin(silent = false): Promise<LoginDetails> {
    if (this.isLoggedIn) {
      return Promise.resolve(this.loginDetails);
    }

    if (silent) {
      return this.retrieve();
    } else {
      return new Promise<LoginDetails>((resolve, reject) => {
        this.retrieve().then(resolve).catch((err) => {
          this.hint().then(resolve).catch(reject);
        });
      });
    }
  }

  // Lets the user sign in using the old auth method, then redirects them back to the current page.
  // (Still requires calling hint() afterwards to log in using YOLO.)
  getOldLoginUrl(): string {
    let current: string = window.location.href;
    // Google does not allow straight IP addresses, so add in .xip.io to get around that.
    current = current.replace(/(https?:\/\/(?:[0-9]{1,3}\.){1,3}[0-9]{1,3})/, '$1.xip.io');
    return encodeURI('https://accounts.google.com/o/oauth2/v2/auth?client_id=' + oAuthClientId + '&redirect_uri=' + current +
      '&response_type=token&scope=email');
  }
}
