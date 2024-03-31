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
import { getUserBalanceByAddress } from "~/db/user";

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
      <WalletConnectButton class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700">
        <p>Connect Wallet</p>
      </WalletConnectButton>

      {login.account && (
        <p class="text-gray-700">Address: {login.account.address}</p>
      )}
      <p class="text-lg font-semibold">Balance: ${userBalance.value}</p>

      <Form onSubmit$={handleSubmit} class="space-y-4">
        <Field name="quantity" type="number">
          {(field, props) => (
            <div class="flex flex-col">
              <input
                {...props}
                type="number"
                value={field.value}
                class="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              />
              {field.error && <div class="text-red-500">{field.error}</div>}
            </div>
          )}
        </Field>
        <button
          type="submit"
          name="long-button"
          value="long"
          class="rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700"
        >
          Long
        </button>
        <button
          type="submit"
          name="short-button"
          value="short"
          class="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700"
        >
          Short
        </button>
      </Form>

      <button
        name="update-balance-button"
        value="update-balance"
        onClick$={async () => {
          if (login.account && login.account.address) {
            const result = await getUserBalanceByAddress(login.account.address);
            if (result) {
              userBalance.value = result;
            }
          }
        }}
        class="mt-4 rounded bg-indigo-500 px-4 py-2 font-bold text-white hover:bg-indigo-700"
      >
        Update Balance
      </button>

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
        class="mt-4 rounded bg-yellow-500 px-4 py-2 font-bold text-white hover:bg-yellow-700"
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
