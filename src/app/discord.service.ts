import { WebappBackendService } from './webapp-backend.service';
import { Injectable } from '@angular/core';

const DISCORD_CLIENT_ID = '478633380267950090';
const REDIRECT_URI = '/api/v1/discord/authCallback';
const AUTH_URI = `https://discordapp.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}`
  + `&response_type=code&scope=identify%20email%20guilds%20guilds.join`;

@Injectable()
export class DiscordService {
  constructor(private backend: WebappBackendService) { }

  getAuthUrl(): Promise<string> {
    return this.backend.getSessionToken().then((token) => {
      let redirect = window.location.protocol + '//' + window.location.hostname;
      console.log(redirect, window.location.protocol);
      if (window.location.protocol === 'http:') {
        redirect += ':4200';
      }
      console.log(redirect, window.location.protocol);
      redirect += REDIRECT_URI;
      return AUTH_URI + '&redirect_uri=' + encodeURIComponent(redirect) + '&state=' + token;
    });
  }
}
