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

  // Send users to this url to log in to their google account if they have never done it before.
  // The user will be sent back to [returnUrl] once they finish signing in (defaults to the current page).
  // Nevermind, I can't get the returnUrl to work. I will leave it here for now in case I figure out a way
  // to make it work.
  createFirstTimeSignInUrl(returnUrl?: string) {
    if (returnUrl == null) {
      returnUrl = window.location.href; // Wherever the user is right now.
    }
    return 'https://accounts.google.com/signin/v2/identifier';
  }
}
