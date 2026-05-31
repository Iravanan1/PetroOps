import { HistoricalMigrationService } from "./server/services/historicalMigration.js";

async function execute() {
  try {
    const result = await HistoricalMigrationService.runMigration();
    console.log("=================================================================");
    console.log("🏆 MIGRATION SUCCESSFULLY FINISHED!");
    console.log(` - Total days processed: ${result.totalDates}`);
    console.log(` - Local AI Avg OCR: ${result.localAvgOcr.toFixed(2)}%`);
    console.log(` - Google AI Avg OCR: ${result.googleAvgOcr.toFixed(2)}%`);
    console.log(` - Local AI Math consistency pass: ${result.localMathPassRate.toFixed(1)}%`);
    console.log(` - Google AI Math consistency pass: ${result.googleMathPassRate.toFixed(1)}%`);
    console.log("=================================================================");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed with error: ", err);
    process.exit(1);
  }
}

execute();
