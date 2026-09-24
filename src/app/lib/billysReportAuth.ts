import { createHmac, timingSafeEqual } from "node:crypto";

// Billy's Report is the only feature on the site that writes data, so it
// gets a lightweight shared-passcode gate rather than a full account
// system — reading stays public for the whole league.
//
// The token is HMAC(iat, key=passcode) — signed with the *current* passcode
// value, not a separate secret. That gives a free "revoke everyone" switch:
// changing BILLYS_REPORT_PASSCODE in Vercel instantly invalidates every
// previously-issued token, since verifying recomputes the signature with
// the new value. No session storage or database needed.

const TOKEN_HEADER = "x-billys-token";

function getPasscode(): string | null {
  const v = process.env.BILLYS_REPORT_PASSCODE;
  return v && v.length > 0 ? v : null;
}

function sign(iat: string, passcode: string): string {
  return createHmac("sha256", passcode).update(iat).digest("hex");
}

export function isBillysAuthConfigured(): boolean {
  return getPasscode() != null;
}

export function checkBillysPasscode(input: string): boolean {
  const passcode = getPasscode();
  return passcode != null && input.length > 0 && input === passcode;
}

export function issueBillysToken(): string {
  const passcode = getPasscode();
  if (!passcode) throw new Error("BILLYS_REPORT_PASSCODE is not set.");
  const iat = String(Date.now());
  return `${iat}.${sign(iat, passcode)}`;
}

export function verifyBillysToken(token: string | null): boolean {
  const passcode = getPasscode();
  if (!passcode || !token) return false;

  const [iat, sig] = token.split(".");
  if (!iat || !sig) return false;

  const expected = sign(iat, passcode);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export function requireBillysAuth(req: Request): boolean {
  return verifyBillysToken(req.headers.get(TOKEN_HEADER));
}
