import {
  $,
  type QRL,
  component$,
  useSignal,
  useContext,
} from "@builder.io/qwik";
import {
  type DocumentHead,
  z,
  routeLoader$,
  server$,
} from "@builder.io/qwik-city";
import {
  type InitialValues,
  type SubmitHandler,
  formAction$,
  useForm,
  zodForm$,
} from "@modular-forms/qwik";
import { signMessage } from "@wagmi/core";
import { keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  LoginContext,
  ModalConfigContext,
} from "~/components/connect-wallet/context";
import WalletConnectButton from "~/components/connect-wallet/index";
import { connectToDB } from "~/db";
import {
  createContract,
  settleAllContractsForAddress,
  type Quote,
} from "~/db/contract";
import { getBtcUsdtPrice } from "~/db/price";

const QuoteSchema = z.object({
  quantity: z.number().nonnegative(),
});
type QuoteForm = z.infer<typeof QuoteSchema>;
export const useFormLoader = routeLoader$<InitialValues<QuoteForm>>(() => ({
  quantity: 0,
}));
export const useFormAction = formAction$<QuoteForm>((values) => {
  console.log(values);
}, zodForm$(QuoteSchema));

export const askForQuotation = server$(async function (
  address: string,
  quantity: number,
) {
  const utf8Encoder = new TextEncoder();
  const quote = {
    address,
    quantity,
    nonce: 0,
    price: await getBtcUsdtPrice(),
  } as Quote;
  console.log("quote", quote);
  const hash = keccak256(utf8Encoder.encode(JSON.stringify(quote)));
  console.log("hash", hash);
  const privateKey = this.env.get("PRIVATE_KEY") as `0x${string}`;
  console.log("privateKey", privateKey);
  const account = privateKeyToAccount(privateKey);
  const signature = await account.signMessage({ message: hash });
  console.log("signature", signature);

  return { quote, serverSignature: signature };
});

export const agreeToQuotation = server$(async function (
  quote: Quote,
  serverSignature: string,
  clientSignature: string,
) {
  const db = await connectToDB(this.env);
  console.log("before createContract");
  const result = await createContract(
    db,
    quote,
    serverSignature,
    clientSignature,
  );
  console.log("agreeToQuotation", result);
});

export default component$(() => {
  const modalConfig = useContext(ModalConfigContext);
  const login = useContext(LoginContext);
  const userBalance = useSignal(0);
  const [quoteForm, { Form, Field }] = useForm<QuoteForm>({
    loader: useFormLoader(),
    action: useFormAction(),
    validate: zodForm$(QuoteSchema),
  });

  const handleSubmit: QRL<SubmitHandler<QuoteForm>> = $(
    async (values, event) => {
      if (login.account && event.submitter) {
        const submitter = event.submitter as HTMLInputElement;
        const sign = submitter.value === "long" ? 1 : -1; // Determine if it's a long or short position

        console.log("before askForQuotation");
        const result = await askForQuotation(
          login.account.address as string,
          sign * values.quantity,
        );
        console.log("after askForQuotation");

        console.log("result", result);

        if (modalConfig.config) {
          const signature = await signMessage(modalConfig.config, {
            message: JSON.stringify(result),
          });
          console.log("signature", signature);
          console.log(result);

          await agreeToQuotation(
            result.quote,
            result.serverSignature,
            signature,
          );
        }
      }
    },
  );

  return (
    <>
      <WalletConnectButton>
        <p class="font-normal">Connect Wallet</p>
      </WalletConnectButton>

      {login.account && <p>{login.account.address}</p>}
      <p>{`Balance: ${userBalance.value}`}</p>

      <Form onSubmit$={handleSubmit}>
        <Field name="quantity" type="number">
          {(field, props) => (
            <div>
              <input {...props} type="number" value={field.value} />
              {field.error && <div>{field.error}</div>}
            </div>
          )}
        </Field>
        <button type="submit" name="long-button" value="long">
          Long
        </button>
        <button type="submit" name="short-button" value="short">
          Short
        </button>
      </Form>

      <button
        name="settle-button"
        value="settle"
        onClick$={async () => {
          if (login.account && login.account.address) {
            const result = await settleAllContractsForAddress(
              login.account.address,
            );
            if (result && result.updateUserBalanceByAddressResult) {
              userBalance.value =
                result.updateUserBalanceByAddressResult.balance;
              console.log("diff", result.diff);
            }
          }
        }}
      >
        Settle
      </button>
    </>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
