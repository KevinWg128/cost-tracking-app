import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
console.log("API Key: ", apiKey);

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
}

export const geminiClient = new GoogleGenAI({ apiKey: apiKey || "" });
