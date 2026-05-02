import dotenv from "dotenv";

dotenv.config();

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  githubToken: process.env.GITHUB_TOKEN || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};

export default env;
