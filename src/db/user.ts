import { z } from "@builder.io/qwik-city";
import { type Surreal } from "surrealdb.js";

export const CreateUserIfNotExistsResult = z.object({
  id: z.string(),
});
export type CreateUserIfNotExistsResult = z.infer<
  typeof CreateUserIfNotExistsResult
>;

const CreateUserQuery =
  "CREATE ONLY user SET address = type::string($address), balance = type::number(1000000)";
const CreateUserValidator = z.array(
  z.object({
    id: z.string(),
    address: z.string(),
    balance: z.number().nonnegative(),
  }),
);

const GetUserByAddressQuery =
  "SELECT id, address, balance FROM user WHERE address = type::string($address)";
const GetUserByAddressValidator = z.array(
  z.object({
    id: z.string(),
    address: z.string(),
    balance: z.number().nonnegative(),
  }),
);

export const createUserIfNotExists = async (db: Surreal, address: string) => {
  const getUserByAddressUncheckedResult = (
    await db.query(GetUserByAddressQuery, {
      address,
    })
  ).at(0);
  console.log("Get user by address", getUserByAddressUncheckedResult);

  if (
    getUserByAddressUncheckedResult instanceof Array &&
    getUserByAddressUncheckedResult.length > 0
  ) {
    const getUserByAddressResult = GetUserByAddressValidator.parse(
      getUserByAddressUncheckedResult,
    );
    console.log("getUserByAddressResult");
    console.log(getUserByAddressResult);
    return getUserByAddressResult.at(0);
  } else {
    const createUserResult = CreateUserValidator.parse(
      await db.query(CreateUserQuery, {
        address,
      }),
    ).at(0);
    console.log("createUserResult");
    console.log(createUserResult);
  }
};

export const getUserByAddress = async (db: Surreal, address: string) => {
  const getUserByAddressResult = GetUserByAddressValidator.parse(
    (
      await db.query(GetUserByAddressQuery, {
        address,
      })
    ).at(0),
  );
  return getUserByAddressResult.at(0);
};

const UpdateUserBalanceQuery =
  "UPDATE user SET address = type::string($address), balance = type::number($newBalance)";
const UpdateUserBalanceValidator = z.array(
  z.object({
    id: z.string(),
    address: z.string(),
    balance: z.number().nonnegative(),
  }),
);
export const updateUserBalanceByAddress = async (
  db: Surreal,
  address: string,
  newBalance: number,
) => {
  const updateUserBalanceByAddressResult = UpdateUserBalanceValidator.parse(
    (
      await db.query(UpdateUserBalanceQuery, {
        address,
        newBalance,
      })
    ).at(0),
  );
  console.log(
    "updateUserBalanceByAddressResult",
    updateUserBalanceByAddressResult,
  );
  return updateUserBalanceByAddressResult.at(0);
};
