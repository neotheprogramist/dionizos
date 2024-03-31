import { component$, $, useContext, noSerialize, Slot } from "@builder.io/qwik";
import { mainnet, type Chain } from "viem/chains";
import { reconnect, watchAccount } from "@wagmi/core";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi";
import { Button, type ButtonProps } from "~/components/connect-wallet/button";
import {
  LoginContext,
  ModalConfigContext,
} from "~/components/connect-wallet/context";
import { performLogin } from "./server";

const metadata = {
  name: "Web3Modal",
  description: "Web3Modal Example",
  url: "https://web3modal.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

export const returnWeb3ModalAndClient = async (
  projectId: string,
  enableWalletConnect: boolean,
  enableInjected: boolean,
  enableCoinbase: boolean,
  chains: [Chain, ...Chain[]],
) => {
  const config = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
    enableWalletConnect,
    enableInjected,
    enableEIP6963: true,
    enableCoinbase,
  });
  reconnect(config);
  const modal = createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: true,
  });
  return { config, modal };
};

export default component$<
  ButtonProps & {
    enableWalletConnect?: boolean;
    enableInjected?: boolean;
    enableCoinbase?: boolean;
    chains?: [Chain, ...Chain[]];
  }
>((props) => {
  const modalConfig = useContext(ModalConfigContext);
  const login = useContext(LoginContext);

  const setWeb3Modal = $(async () => {
    const projectId = import.meta.env.PUBLIC_PROJECT_ID;
    if (!projectId || typeof projectId !== "string") {
      throw new Error("Missing project ID");
    }
    return returnWeb3ModalAndClient(
      projectId,
      props.enableWalletConnect || false,
      props.enableInjected || false,
      props.enableCoinbase || false,
      props.chains || [mainnet],
    );
  });

  const openWeb3Modal = $(async () => {
    const { config, modal } = await setWeb3Modal();
    await modal.open();
    modalConfig.config = noSerialize(config);
    watchAccount(config, {
      onChange: (account, prevAccount) => {
        console.log("prevAccount: ", prevAccount);
        console.log("account: ", account);
        login.account = noSerialize(account);
        performLogin(login.account?.address);
      },
    });
  });

  return (
    <Button onClick$={openWeb3Modal} image={props.image} class={props.class}>
      <Slot />
    </Button>
  );
});
