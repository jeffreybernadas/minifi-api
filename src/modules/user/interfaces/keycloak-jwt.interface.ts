/**
 * Raw Keycloak JWT token structure as returned by @AuthenticatedUser()
 * This represents the actual structure from Keycloak before any transformation
 */
export interface KeycloakJWT {
  /** Token expiration timestamp (Unix timestamp in seconds) */
  exp: number;

  /** Token issued at timestamp (Unix timestamp in seconds) */
  iat: number;

  /** JWT ID - unique identifier for this token */
  jti: string;

  /** Issuer - Keycloak realm URL */
  iss: string;

  /** Audience - intended recipient of the token */
  aud: string | string[];

  /** Subject - Keycloak user ID (UUID) */
  sub: string;

  /** Token type */
  typ: string;

  /** Authorized party - client ID that requested the token */
  azp: string;

  /** Session ID */
  sid: string;

  /** Session state (alternative to sid in some Keycloak versions) */
  session_state?: string;

  /** Authentication Context Class Reference */
  acr: string;

  /** Allowed origins for CORS */
  'allowed-origins'?: string[];

  /** Realm-level roles (nested structure from Keycloak) */
  realm_access?: {
    roles: string[];
  };

  /** Client-level roles (nested structure from Keycloak) */
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };

  /** OAuth scopes granted */
  scope: string;

  /** Whether the user's email is verified */
  email_verified: boolean;

  /** User's full name */
  name?: string;

  /** Username */
  preferred_username: string;

  /** User's first name */
  given_name?: string;

  /** User's locale/language preference */
  locale?: string;

  /** User's last name */
  family_name?: string;

  /** User's email address */
  email: string;

  /** User's profile picture URL */
  picture?: string;
}
