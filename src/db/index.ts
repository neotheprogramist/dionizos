import { type EnvGetter } from "@builder.io/qwik-city/middleware/request-handler";
import { Surreal } from "surrealdb.js";

export const connectToDB = async (env: EnvGetter) => {
  const db = new Surreal();
  const url = env.get("SURREALDB_URL");
  const namespace = env.get("SURREALDB_NS");
  const database = env.get("SURREALDB_DB");
  const username = env.get("SURREALDB_USER");
  const password = env.get("SURREALDB_PASS");
  console.log(
    "Connecting to SurrealDB",
    url,
    namespace,
    database,
    username,
    password,
  );
  if (!url || !namespace || !database || !username || !password) {
    const errorMessage = !url
      ? "Missing SURREALDB_URL"
      : "" + !username
        ? "Missing SURREALDB_USER"
        : "" + !password
          ? "Missing SURREALDB_PASS"
          : "" + !namespace
            ? "Missing SURREALDB_NS"
            : "" + !database
              ? "Missing SURREALDB_DB"
              : "";
    throw new Error(errorMessage);
  }

  await db.connect(url, {
    namespace,
    database,
    auth: {
      namespace,
      database,
      username,
      password,
    },
  });
  return db;
};
