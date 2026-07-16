import {
  ok,
  type ProblemDetails,
  type Result,
  StandardError,
} from "@forge-ahead/errors";
import type {
  ForgeRemoteContext,
  ForgeRemoteContextForwardedTokens,
} from "./context";

export type RemoteInvocationAuthentication =
  | "forge-invocation-token"
  | "caller-owned";

export interface RemoteInvocationContractForwardedTokenRequirements {
  system?: boolean;
  user?: boolean;
}

export interface DefineRemoteInvocationContractInput {
  name: string;
  authentication: RemoteInvocationAuthentication;
  requiredForwardedTokens?: RemoteInvocationContractForwardedTokenRequirements;
}

export interface RemoteInvocationContract {
  name: string;
  authentication: RemoteInvocationAuthentication;
  requiredForwardedTokens: RemoteInvocationContractForwardedTokenRequirements;
}

export function defineRemoteInvocationContract(
  input: DefineRemoteInvocationContractInput,
): RemoteInvocationContract {
  return {
    name: input.name,
    authentication: input.authentication,
    requiredForwardedTokens: input.requiredForwardedTokens ?? {},
  };
}

export interface RemoteInvocationContractMatch {
  context: ForgeRemoteContext;
  contract: RemoteInvocationContract;
  forwardedTokens: ForgeRemoteContextForwardedTokens;
}

function remoteInvocationContractMismatch(
  detail: string,
): Result<never, ProblemDetails> {
  return StandardError.getOrDefault(400).error(detail);
}

export function validateRemoteInvocationContract(
  context: ForgeRemoteContext,
  contract: RemoteInvocationContract,
): Result<RemoteInvocationContractMatch, ProblemDetails> {
  if (
    contract.requiredForwardedTokens.system &&
    context.forwardedTokens?.system === undefined
  ) {
    return remoteInvocationContractMismatch(
      "Remote Invocation Contract requires a forwarded system token",
    );
  }
  if (
    contract.requiredForwardedTokens.user &&
    context.forwardedTokens?.user === undefined
  ) {
    return remoteInvocationContractMismatch(
      "Remote Invocation Contract requires a forwarded user token",
    );
  }
  return ok({
    context,
    contract,
    forwardedTokens: context.forwardedTokens ?? {},
  });
}
