import { server$ } from "@builder.io/qwik-city";
import { connectToDB } from "~/db";
import { createUserIfNotExists } from "~/db/user";

export const performLogin = server$(async function (address) {
  console.log("PERFORM LOGIN");
  const db = await connectToDB(this.env);

  const newUser = await createUserIfNotExists(db, address);
  console.log("newUser", newUser);

  this.cookie.set("USER", address);
});
