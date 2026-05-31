import { ProviderValidator } from "../server/services/providerValidator.js";
import dotenv from "dotenv";

// Ensure we load .env file variables
dotenv.config();

async function main() {
  ProviderValidator.validateEnvironment();
  const results = await ProviderValidator.runConnectivityTests();
  console.log("\n=================================================================");
  console.log("🏆 CONNECTIVITY SANITY HANDSHAKE COMPLETED!");
  console.log("=================================================================");
  process.exit(0);
}

main();
