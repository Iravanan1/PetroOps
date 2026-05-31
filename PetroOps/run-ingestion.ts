import { ProviderValidator } from "./server/services/providerValidator.js";
import { DocumentIntelligencePipeline } from "./server/services/documentIntelligencePipeline.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function execute() {
  try {
    console.log("=================================================================");
    console.log("🏁 PETROOPS PIPELINE STARTUP BOOTSTRAP & INTEGRITY CHECK");
    console.log("=================================================================");
    
    const args = process.argv.slice(2);
    const cleanMode = args.includes("--clean") || args.includes("-c") || args.includes("--rebuild");
    
    if (cleanMode) {
      console.log("🧹 Clean Rebuild Mode Activated. Resetting manifest checkpoint and wiping shifts collection...");
      const manifestPath = path.join(process.cwd(), "processed_files.json");
      if (fs.existsSync(manifestPath)) {
        fs.unlinkSync(manifestPath);
        console.log("✅ Checkpoint manifest file processed_files.json deleted.");
      }
      
      await DocumentIntelligencePipeline.wipeDatabaseCollection();
    }
    
    // 1. Validate environment parameters
    ProviderValidator.validateEnvironment();
    
    // 2. Perform live AI provider connectivity tests
    await ProviderValidator.runConnectivityTests();
    
    // 3. Trigger sequential ingestion & cross-validation pipeline
    const result = await DocumentIntelligencePipeline.runPipeline(10);
    
    console.log("\n=================================================================");
    console.log("🏆 MIGRATION & RECONCILIATION COMPLETED SUCCESSFULLY!");
    console.log(` - Total chronological shifts logged: ${result.total}`);
    console.log(` - Real-time on-device EasyOCR processed: ${result.newlyProcessedCount}`);
    console.log(` - Chronologically pre-indexed processed: ${result.cachedCount}`);
    console.log("=================================================================");
    process.exit(0);
  } catch (err) {
    console.error("Pipeline run failed with error: ", err);
    process.exit(1);
  }
}

execute();
