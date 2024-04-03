import { server$, z } from "@builder.io/qwik-city";
import { type Surreal } from "surrealdb.js";
import { connectToDB } from ".";
import { getUserByAddress, updateUserBalanceByAddress } from "./user";
import { getBtcUsdtPrice } from "./price";

export interface Quote {
  address: string;
  quantity: number;
  nonce: number;
  price: number;
}

export const CreateContractResult = z.object({
  id: z.string(),
  address: z.string(),
  quantity: z.number(),
  nonce: z.bigint(),
  price: z.number(),
  serverSignature: z.string(),
  clientSignature: z.string(),
});
export type CreateContractResult = z.infer<typeof CreateContractResult>;

const CreateContractQuery = `CREATE ONLY contract SET
    address = type::string($address),
    quantity = type::number($quantity),
    nonce = type::number($nonce),
    price = type::number($price),
    serverSignature = type::string($serverSignature),
    clientSignature = type::string($clientSignature)`;
const CreateContractValidator = z.array(
  z.object({
    id: z.string(),
    address: z.string(),
    quantity: z.number(),
    nonce: z.number(),
    price: z.number(),
    serverSignature: z.string(),
    clientSignature: z.string(),
  }),
);
export const createContract = async (
  db: Surreal,
  quote: Quote,
  serverSignature: string,
  clientSignature: string,
) => {
  const createContractResult = CreateContractValidator.parse(
    await db.query(CreateContractQuery, {
      address: quote.address,
      quantity: quote.quantity,
      nonce: quote.nonce,
      price: quote.price,
      serverSignature,
      clientSignature,
    }),
  ).at(0);
  return createContractResult;
};

const GetContractQuery = `SELECT
  id,
  address,
  quantity,
  nonce,
  price,
  serverSignature,
  clientSignature
  FROM contract
  WHERE address = type::string($address)`;
const GetContractValidator = z.array(
  z.object({
    id: z.string(),
    address: z.string(),
    quantity: z.number(),
    nonce: z.number(),
    price: z.number(),
    serverSignature: z.string(),
    clientSignature: z.string(),
  }),
);
export const getAllContractsForAddress = async function (
  db: Surreal,
  address: string,
) {
  const getContractResult = GetContractValidator.parse(
    (
      await db.query(GetContractQuery, {
        address,
      })
    ).at(0),
  );
  return getContractResult;
};

const DeleteContractsByIdsQuery = `DELETE contract WHERE id IN ($ids) RETURN BEFORE`;
const DeleteContractsByIdsValidator = z.array(
  z.object({
    id: z.string(),
    address: z.string(),
    quantity: z.number(),
    nonce: z.number(),
    price: z.number(),
    serverSignature: z.string(),
    clientSignature: z.string(),
  }),
);
export const deleteContractsByIds = async function (
  db: Surreal,
  ids: Array<string>,
) {
  const deleteContractsByIdsResult = DeleteContractsByIdsValidator.parse(
    (
      await db.query(DeleteContractsByIdsQuery, {
        ids,
      })
    ).at(0),
  );
  return deleteContractsByIdsResult;
};

export const settleAllContractsForAddress = server$(async function (
  address: string,
) {
  const db = await connectToDB(this.env);
  const contracts = await getAllContractsForAddress(db, address);
  const user = await getUserByAddress(db, address);
  const price = await getBtcUsdtPrice();
  if (user) {
    let diff = 0;
    const toDeleteContractIds = [];
    for (const contract of contracts) {
      diff += (price - contract.price) * contract.quantity;
      console.log("diff", diff);
      toDeleteContractIds.push(contract.id);
    }
    const deleteContractsByIdsResult = await deleteContractsByIds(
      db,
      toDeleteContractIds,
    );
    console.log("deleteContractsByIdsResult", deleteContractsByIdsResult);
    const updateUserBalanceByAddressResult = await updateUserBalanceByAddress(
      db,
      address,
      user.balance + diff,
    );
    console.log("diff", diff);
    return { updateUserBalanceByAddressResult, diff };
  }
});

export const estimateAllContractsForAddress = server$(async function (
  address: string,
) {
  const db = await connectToDB(this.env);
  const contracts = await getAllContractsForAddress(db, address);
  const user = await getUserByAddress(db, address);
  const price = await getBtcUsdtPrice();
  if (user) {
    let diff = 0;
    for (const contract of contracts) {
      diff += (price - contract.price) * contract.quantity;
    }
    return { diff };
  }
});