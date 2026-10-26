import { api, CONSOLE_CSRF_HEADER, type ApiClient } from '@/lib/api/client';

/** `clientType` 2 is the console (API design 10.1). */
const CONSOLE = 2;

export interface OtpRequested {
  resendAfterSeconds: number;
  expiresInSeconds: number;
}

export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
  mfaEnrolled: boolean;
}

export interface LoginTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  person: {
    id: string;
    email: string;
    /** Null until the person's name is known (API design 10.2). */
    firstName: string | null;
    lastName: string | null;
    preferredLanguage: string;
  };
}

export interface MfaEnrolment {
  /** otpauth:// URI for the authenticator app; shown once. */
  setupUri: string;
  secret: string;
}

/** The console's login calls: AUTH-01, 02, 03, 04, 07, 08 (API design 9.1, 10.1, 10.2). */
export function createAuthApi(client: ApiClient = api) {
  return {
    requestOtp(email: string) {
      return client.data<OtpRequested>('auth/otp', {
        method: 'POST',
        anonymous: true,
        body: { email, clientType: CONSOLE },
      });
    },
    verifyOtp(email: string, code: string) {
      return client.data<MfaChallenge | LoginTokens>('auth/otp/verify', {
        method: 'POST',
        anonymous: true,
        body: { email, code, clientType: CONSOLE },
      });
    },
    enrolMfa(mfaToken: string) {
      return client.data<MfaEnrolment>('auth/mfa/enrol', {
        method: 'POST',
        anonymous: true,
        body: { mfaToken },
      });
    },
    verifyMfa(mfaToken: string, code: string) {
      return client.data<LoginTokens>('auth/mfa/verify', {
        method: 'POST',
        anonymous: true,
        body: { mfaToken, code },
      });
    },
    logout() {
      return client.data<null>('auth/logout', { method: 'POST', headers: CONSOLE_CSRF_HEADER });
    },
    logoutAll() {
      return client.data<null>('auth/logout-all', { method: 'POST', headers: CONSOLE_CSRF_HEADER });
    },
  };
}

export const authApi = createAuthApi();

export function isMfaChallenge(value: MfaChallenge | LoginTokens): value is MfaChallenge {
  return 'mfaRequired' in value && value.mfaRequired === true;
}
