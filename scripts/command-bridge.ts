#!/usr/bin/env npx tsx

import {
  createCommandPrompt,
} from "../packages/core/src/index.ts";

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (command !== "comprehend" && command !== "comprehend-summary" && command !== "comprehend-chat") {
    console.error("Usage: npx tsx scripts/command-bridge.ts <comprehend|comprehend-summary|comprehend-chat> [arguments]");
    process.exit(1);
  }

  const prompt = await createCommandPrompt({
    command,
    argumentsText: rest.join(" "),
  });

  console.log(prompt);
}

await main();
