import { GoogleGenAI } from "@google/genai";
import env from "../config/env.js";

console.log("Gemini Key Loaded:", !!process.env.GEMINI_API_KEY);

const emptyInsights = {
  archetype: "",
  strengths: [],
  weaknesses: [],
  growthTrajectory: "",
  hireVerdict: {
    decision: "CONDITIONAL",
    reason: "",
  },
};

const sanitizeInsights = (parsed) => {
  if (!parsed || typeof parsed !== "object") return emptyInsights;

  return {
    archetype: typeof parsed.archetype === "string" ? parsed.archetype : "",
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.filter((item) => typeof item === "string")
      : [],
    weaknesses: Array.isArray(parsed.weaknesses)
      ? parsed.weaknesses.filter((item) => typeof item === "string")
      : [],
    growthTrajectory:
      typeof parsed.growthTrajectory === "string" ? parsed.growthTrajectory : "",
    hireVerdict: {
      decision:
        parsed.hireVerdict?.decision === "YES" ||
          parsed.hireVerdict?.decision === "NO" ||
          parsed.hireVerdict?.decision === "CONDITIONAL"
          ? parsed.hireVerdict.decision
          : "CONDITIONAL",
      reason: typeof parsed.hireVerdict?.reason === "string" ? parsed.hireVerdict.reason : "",
    },
  };
};

const buildPrompt = (analytics) => `You are a senior engineering manager reviewing a developer strictly based on quantitative GitHub metrics.

You MUST reference actual values in your reasoning.

Metrics:
- Dev Score: ${analytics.devScore}
- Activity Score: ${analytics.activityScore}
- Consistency Score: ${analytics.consistencyScore}
- Avg Stars: ${analytics.avgStars}
- Language Diversity: ${analytics.languageDiversityScore}
- Total Repos: ${analytics.totalRepos}
- Primary Language: ${analytics.mostUsedLanguage}

Rules:
- DO NOT use generic praise (e.g., 'excellent developer')
- Each strength/weakness must reference a metric explicitly
- Be concise and analytical
- Sound like a technical evaluator, not a chatbot

Return ONLY JSON:

{
  "archetype": "",
  "strengths": [],
  "weaknesses": [],
  "growthTrajectory": "",
  "hireVerdict": {
    "decision": "YES | NO | CONDITIONAL",
    "reason": ""
  }
}`;

export const generateInsights = async (analytics) => {
  if (!env.geminiApiKey) return emptyInsights;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = buildPrompt(analytics);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = response.text;

    console.log("RAW GEMINI RESPONSE:", text);

    if (!text || text.trim().length < 20) {
      throw new Error("Empty or invalid Gemini response");
    }

    let jsonString = "";

    const match = text.match(/```json([\s\S]*?)```/i);
    if (match) {
      jsonString = match[1];
    } else {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        jsonString = text.substring(start, end + 1);
      }
    }

    if (!jsonString.trim()) return emptyInsights;

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("JSON parse failed:", text);
      return emptyInsights;
    }

    console.log("PARSED JSON:", parsed);
    return sanitizeInsights(parsed);
  } catch (error) {
    console.error("GEMINI ERROR:", error);
    return emptyInsights;
  }
};

