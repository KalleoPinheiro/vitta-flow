import { google } from "googleapis";
import type { GoogleOAuthConfig } from "./google-oauth";

export function createOAuthClient(config: GoogleOAuthConfig) {
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}
