import { type NoSerialize, createContextId } from "@builder.io/qwik";
import { type GetAccountReturnType, type Config } from "@wagmi/core";

export interface ModalConfig {
  config?: NoSerialize<Config>;
}

export const ModalConfigContext = createContextId<ModalConfig>(
  "modal-config-context",
);

export interface Login {
  account?: NoSerialize<GetAccountReturnType>;
}

export const LoginContext = createContextId<Login>("login-context");
