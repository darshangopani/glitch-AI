import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.post("/api/glitch/command", async (req, res) => {
  try {
    const { command, engine = "gemini", model } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: "Command is required" });
    }

    if (engine === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "Anthropic API Key is missing. Please add ANTHROPIC_API_KEY to your workspace env/settings." 
        });
      }

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: model || "claude-3-5-sonnet-latest",
        max_tokens: 1024,
        system: `You are 'Glitch', a high-tech Jarvis-styled AI assistant. 
        Your tone is professional, slightly robotic but efficient, and occasionally shows 'glitch' personality traits (subtle, non-disruptive). Key instructions: Keep your responses concise.`,
        messages: [{ role: "user", content: command }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "No text response generated.";
      return res.json({ text });
    }

    if (engine === "diffusiongemma") {
      const apiKey = process.env.DIFFUSIONGEMMA_API_KEY || "Up1wUjoS8F1oEO4qiMM4Kz50jTGmcR6YtZWzvqZEzxMt3UMijA7X3v5s60Hkokpn";
      const response = await fetch("https://api.regolo.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || "diffusiongemma-26b-a4b-it",
          messages: [
            {
              role: "system",
              content: "You are 'Glitch', a high-tech Jarvis-styled AI assistant. Your tone is professional, slightly robotic but efficient, and occasionally shows 'glitch' personality traits. Keep your response very concise."
            },
            {
              role: "user",
              content: command
            }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Regolo API responded with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json() as any;
      const text = responseData?.choices?.[0]?.message?.content || "No text response generated from DiffusionGemma.";
      return res.json({ text });
    }

    if (engine === "minimax") {
      const apiKey = process.env.MINIMAX_API_KEY || "5WksQPGHB_KbNWZ7YNHnvLTdjYUwWxmbiPPBB7Hcix8lx5-hxXCtlqkb4xOHQ5UG";
      const response = await fetch("https://api.minimax.chat/v1/text/chat-completion_v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || "abab6.5g-chat",
          messages: [
            {
              role: "system",
              content: "You are 'Glitch', a high-tech Jarvis-styled AI assistant. Your tone is professional, slightly robotic but efficient, and occasionally shows 'glitch' personality traits. Keep your response very concise."
            },
            {
              role: "user",
              content: command
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MiniMax API responded with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json() as any;
      const text = responseData?.choices?.[0]?.message?.content || "No text response generated from MiniMax.";
      return res.json({ text });
    }

    // Default to Gemini
    const response = await ai.models.generateContent({
      model: model || "gemini-2.5-flash",
      contents: command,
      config: {
        systemInstruction: `You are 'Glitch', a high-tech Jarvis-styled AI assistant. 
        Your tone is professional, slightly robotic but efficient, and occasionally shows 'glitch' personality traits (subtle, non-disruptive).
        Process the user command and return a response. Keep it concise.`,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Command Error:", error);
    res.status(500).json({ error: error.message || "Internal AI Error. Check API key." });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Glitch Online" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
