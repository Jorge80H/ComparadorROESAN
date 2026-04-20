import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
    console.log("Available models for this key:");
    result.models.forEach(m => {
      console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(", ")})`);
    });
  } catch (err) {
    console.error("Error listing models:", err.message);
    // If listModels fails, try a direct fetch to the API
    console.log("Trying direct API fetch...");
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await res.json();
      if (data.models) {
        data.models.forEach(m => console.log(`- ${m.name}`));
      } else {
        console.log("No models returned:", data);
      }
    } catch (fetchErr) {
      console.error("Direct fetch failed:", fetchErr.message);
    }
  }
}

listModels();
