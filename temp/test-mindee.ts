/**
 * Standalone Sanity Check for Mindee
 */
import * as mindee from "mindee";
import fs from "fs";

async function test() {
  const apiKey = process.env.MINDEE_API_KEY;
  const filePath = process.argv[2];

  if (!apiKey || !filePath) {
    console.error("Usage: $env:MINDEE_API_KEY='xxx'; npx tsx temp/test-mindee.ts <path_to_image>");
    process.exit(1);
  }

  console.log(`Analyzing file: ${filePath}`);
  
  try {
    const mindeeClient = new mindee.ClientV2({ apiKey });
    const inputSource = new mindee.PathInput({ inputPath: filePath });
    
    const response = await mindeeClient.enqueueAndGetInference(inputSource, {
      modelId: "9e7c3703-d378-4a01-a43c-03beb6f8da11",
    });

    console.log("\n--- Extraction Trace ---");
    const rawInference = (response as any).rawHttp?.inference;
    const fields = rawInference?.result?.fields ?? (response as any).inference?.result?.fields;

    if (fields) {
      console.log("Fields found:", Object.keys(fields).filter(k => !k.startsWith('_')));
      for (const [key, field] of Object.entries(fields)) {
        if (!key.startsWith('_')) {
          console.log(`${key}:`, (field as any).value);
        }
      }
    } else {
      console.log("No fields found. SDK structure changed?");
      console.log("Keys available:", Object.keys(response));
    }

  } catch (err) {
    console.error("\nError during scan:", err);
  }
}

test();
