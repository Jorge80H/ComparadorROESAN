import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const apiKeyLine = env.split("\n").find(line => line.startsWith("GEMINI_API_KEY="));
const apiKey = apiKeyLine.split("=")[1].trim();

async function listModels() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      console.log(data.models.map(m => m.name).join("\n"));
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
