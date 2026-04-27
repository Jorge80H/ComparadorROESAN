import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
const env = fs.readFileSync(".env", "utf8");
const apiKey = env.split("\n").find(line => line.startsWith("GEMINI_API_KEY=")).split("=")[1].trim();

async function test() {
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  console.log("Testing with API Key:", apiKey.substring(0, 10) + "...");
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Test with gemini-1.5-flash (the one I set)
  console.log("Testing model: gemini-1.5-flash");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Respond with 'OK' if you can read this.");
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("Error with gemini-1.5-flash:", error.message);
  }

  // Test with gemini-2.5-flash (to see if it fails as expected)
  console.log("\nTesting model: gemini-2.5-flash");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("test");
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("Error with gemini-2.5-flash (Expected):", error.message);
  }
}

test();
