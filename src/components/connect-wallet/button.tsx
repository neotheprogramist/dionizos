import { type QRL, component$, Slot } from "@builder.io/qwik";
import ImgArrowForward from "~/media/arrow-forward.svg?jsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps {
  image?: string;
  buttonWidth?: string;
  borderColor?: string;
  padding?: string;
  containerGap?: string;
  fontSize?: string;
  onClick$?: QRL<() => Promise<void>>;
  class?: string;
}

export const Button = component$<ButtonProps>((props) => {
  return (
    <button
      onClick$={props.onClick$}
      class={twMerge(
        "flex items-center justify-between rounded-3xl border-2",
        props.class,
      )}
    >
      <div class="flex items-center">
        {props.image && <img src={props.image} width="24" height="24" />}
        <Slot />
      </div>
      <ImgArrowForward />
    </button>
  );
});
