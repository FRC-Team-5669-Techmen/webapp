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
  private loginDetails: Promise<LoginDetails>; // Promise is fulfilled whenever the user logs in to their google account.
  private loginPromise: Promise<LoginDetails>; // Holds a smaller promise for whatever method is currently being attempted (fg, bg).
  private resolveLoginDetails: (LoginDetails) => void;
  private polledLoginDetails: LoginDetails = null; // For when something only needs login details if they're available right at that moment.
  private loginResolved = false;

  // Loads Google's YOLO one-click sign in library and attempts to automatically log in returning users.
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
    // Wrapper promise. resolveLoginDetails() is called whenever any login method succeeds.
    this.loginDetails = new Promise<LoginDetails>((resolve, reject) => {
      this.resolveLoginDetails = (e) => {
        this.loginResolved = true;
        this.polledLoginDetails = e;
        resolve(e);
      };
    });
    // Smaller promise. Resolved or rejected when a particular login method fails or succeeds. In this case, it is for
    // the background login method.
    this.loginPromise = new Promise<LoginDetails>((resolve, reject) => {
      this.yoloObj.then((yoloObj: YoloObj) => {
        yoloObj.retrieve({
          supportedAuthMethods: ['https://accounts.google.com'],
          supportedIdTokenProviders: [{
            uri: 'https://accounts.google.com',
            clientId: oAuthClientId
          }]
        }).then(resolve).catch(reject);
      });
    });
    this.loginPromise.then(this.resolveLoginDetails); // If this method succeeds, resolve the wrapper promise.
  }

  // Returns a promise that is resolved / rejected when the current login attempt finishes. If hint() has never been called, the current
  // login attempt is a simple no-user-interaction-required background login. If hint() has been called and the previous login attempt has
  // finished, the current login attempt will be prompting the user to select one of their accounts that they are already logged in to.
  // Note that this method will fail if the user is not currently logged into any of their google accounts.
  getCurrentLoginAttempt(): Promise<LoginDetails> {
    return this.loginPromise;
  }

  hint(): Promise<LoginDetails> {
    if (this.loginResolved) {
      return Promise.resolve(this.polledLoginDetails);
    } else { // Only do this if we have not gotten a login from the user before.
      // We are now trying a different method of authentication. loginPromise should be replaced with what we are currently trying.
      const oldLoginPromise = this.loginPromise;
      this.loginPromise = new Promise<LoginDetails>((resolve, reject) => {
        oldLoginPromise
          .then(resolve) // If the old promise succeeds (maybe it was still WIP when we started) resolve this one too, for anything
                         // waiting specifically on this particular login attempt.
          .catch(() => { // Only do this when (if ever) the previous attempt finishes failing.
            this.yoloObj.then((yoloObj) => {
              yoloObj.hint({
                supportedAuthMethods: ['https://accounts.google.com'],
                supportedIdTokenProviders: [{
                  uri: 'https://accounts.google.com',
                  clientId: oAuthClientId
                }]
              }).then((loginDetails: LoginDetails) => {
                // If this method succeeds, resolve both this and the wrapper promise.
                this.resolveLoginDetails(loginDetails);
                resolve(loginDetails);
              }).catch(reject);
            });
          });
      });
      return this.loginPromise;
    }
  }

  get isLoggedIn(): boolean {
    return this.loginResolved;
  }

  // Returns a promise that will resolve when the user logs in.
  // (Asyncronous)
  getLoginDetailsAsync(): Promise<LoginDetails> {
    return this.loginDetails;
  }

  // Returns login details if someone has logged in, or null if no one has logged in yet.
  // (Synchronous non-blocking)
  pollLoginDetails(): LoginDetails {
    return this.polledLoginDetails;
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
