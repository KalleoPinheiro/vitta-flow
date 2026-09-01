import { google } from "googleapis";

/** Só o que o cliente OAuth precisa — nenhuma política de autorização. */
export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function createOAuthClient(config: OAuthClientConfig) {
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}
