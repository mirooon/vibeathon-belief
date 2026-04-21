/* eslint-disable no-console */
import "reflect-metadata";
import { seed } from "../src/seed/seed.js";

async function main(): Promise<void> {
  const mongoUrl =
    process.env.MONGO_URL ?? "mongodb://localhost:27017/vibeahack";
  await seed({ mongoUrl });
}

main().catch((err) => {
  console.error("[seed] FAILED", err);
  process.exit(1);
});
