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

export interface RemoteInvocationContractAcknowledgement {
  status: number;
  description: string;
}

export interface DefineRemoteInvocationContractInput {
  name: string;
  authentication: RemoteInvocationAuthentication;
  requiredForwardedTokens?: RemoteInvocationContractForwardedTokenRequirements;
  acknowledgement?: RemoteInvocationContractAcknowledgement;
  installationIdRequired?: boolean;
  systemTokenRehydration?: "possible";
}

export interface RemoteInvocationContract {
  name: string;
  authentication: RemoteInvocationAuthentication;
  requiredForwardedTokens: RemoteInvocationContractForwardedTokenRequirements;
  acknowledgement?: RemoteInvocationContractAcknowledgement;
  installationIdRequired?: boolean;
  systemTokenRehydration?: "possible";
}

export function defineRemoteInvocationContract(
  input: DefineRemoteInvocationContractInput,
): RemoteInvocationContract {
  return {
    name: input.name,
    authentication: input.authentication,
    requiredForwardedTokens: input.requiredForwardedTokens ?? {},
    acknowledgement: input.acknowledgement,
    installationIdRequired: input.installationIdRequired,
    systemTokenRehydration: input.systemTokenRehydration,
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

export const customUiInvocation: RemoteInvocationContract =
  defineRemoteInvocationContract({
    name: "custom-ui-invocation",
    authentication: "forge-invocation-token",
    requiredForwardedTokens: { system: true, user: true },
  });

export const backendFunctionInvocation: RemoteInvocationContract =
  defineRemoteInvocationContract({
    name: "backend-function-invocation",
    authentication: "forge-invocation-token",
    requiredForwardedTokens: { system: true },
  });

export const asyncEventInvocation: RemoteInvocationContract =
  defineRemoteInvocationContract({
    name: "async-event-invocation",
    authentication: "forge-invocation-token",
    requiredForwardedTokens: { system: true },
    acknowledgement: {
      status: 202,
      description: "Accepted for asynchronous processing",
    },
  });

export const scheduledTriggerInvocation: RemoteInvocationContract =
  defineRemoteInvocationContract({
    name: "scheduled-trigger-invocation",
    authentication: "forge-invocation-token",
    requiredForwardedTokens: { system: true },
  });

export const externalRemoteInvocation: RemoteInvocationContract =
  defineRemoteInvocationContract({
    name: "external-remote-invocation",
    authentication: "caller-owned",
    installationIdRequired: true,
    systemTokenRehydration: "possible",
  });
