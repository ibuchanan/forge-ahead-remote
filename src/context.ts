import type { JwtPayload } from "./jwt";

export interface ForgeInvocationTokenPayload extends JwtPayload {
  [claim: string]: unknown;
}

export interface ForgeRemoteContextVerification {
  audience: string;
  issuer?: string;
}

export type ForwardedForgeTokenKind = "system" | "user";

export interface ForwardedForgeToken {
  kind: ForwardedForgeTokenKind;
  token: string;
}

export interface ForgeRemoteContextForwardedTokens {
  system?: ForwardedForgeToken;
  user?: ForwardedForgeToken;
}

export interface ForgeRemoteContext {
  fit: ForgeInvocationTokenPayload;
  verification: ForgeRemoteContextVerification;
  forwardedTokens?: ForgeRemoteContextForwardedTokens;
}

export interface BuildForgeRemoteContextInput {
  fit: ForgeInvocationTokenPayload;
  verification: ForgeRemoteContextVerification;
  forwardedSystemToken?: string;
  forwardedUserToken?: string;
}

function buildForwardedTokens(
  input: BuildForgeRemoteContextInput,
): ForgeRemoteContextForwardedTokens | undefined {
  if (
    input.forwardedSystemToken === undefined &&
    input.forwardedUserToken === undefined
  ) {
    return undefined;
  }
  const forwardedTokens: ForgeRemoteContextForwardedTokens = {};
  if (input.forwardedSystemToken !== undefined) {
    forwardedTokens.system = {
      kind: "system",
      token: input.forwardedSystemToken,
    };
  }
  if (input.forwardedUserToken !== undefined) {
    forwardedTokens.user = { kind: "user", token: input.forwardedUserToken };
  }
  return forwardedTokens;
}

export function buildForgeRemoteContext(
  input: BuildForgeRemoteContextInput,
): ForgeRemoteContext {
  return {
    fit: input.fit,
    verification: input.verification,
    forwardedTokens: buildForwardedTokens(input),
  };
}
