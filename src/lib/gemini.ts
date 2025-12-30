import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    logger.warn("GEMINI_API_KEY is not set in environment variables.");
} else {
    // Log only that the key is configured, not the actual key
    logger.debug("Gemini API key configured", {
        keyLength: apiKey.length,
        keyLastChars: `****${apiKey.slice(-4)}`
    });
}

export const geminiClient = new GoogleGenAI({ apiKey: apiKey || "" });

