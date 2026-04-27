import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const apiKey = env.split("\n").find(line => line.startsWith("GEMINI_API_KEY=")).split("=")[1].trim();

const modelsToTest = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-002",
  "gemini-1.5-pro",
];

async function runTests() {
  const genAI = new GoogleGenerativeAI(apiKey);
  for (const modelName of modelsToTest) {
    console.log(`Testing ${modelName}...`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hola");
      console.log(`✅ ${modelName} OK: ${result.response.text().substring(0, 20)}...`);
    } catch (error) {
      console.log(`❌ ${modelName} FAILED: ${error.message}`);
    }
  }
}

runTests();
