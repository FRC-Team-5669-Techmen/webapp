import { WebappBackendService } from './webapp-backend.service';
import { Injectable } from '@angular/core';

const DISCORD_CLIENT_ID = '478633380267950090';
const REDIRECT_URI = (global['productionMode'] ? 'https://frc5669.port0.org' : 'http://localhost:4200') + '/api/v1/discord/authCallback';
console.log(REDIRECT_URI);
const AUTH_URI = `https://discordapp.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}`
  + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20email%20guilds%20guilds.join`;

@Injectable()
export class DiscordService {
  constructor(private backend: WebappBackendService) { }

  getAuthUrl(): Promise<string> {
    return this.backend.getSessionToken().then((token) => {
      return AUTH_URI + '&state=' + token;
    });
  }
}
