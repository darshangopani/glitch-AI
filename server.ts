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
    const { command, engine = "gemini", model, history = [], systemContext, climateContext } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: "Command is required" });
    }

    // Build rich ambient environment and system telemetry metrics
    const telemetryContext = `
[REAL-TIME GLITCH.AI KERNEL TELEMETRY]
- HOST HARDWARE STATUS:
  * CPU Cores Available: ${systemContext?.cores || "Unknown"}
  * Total Host System Memory: ${systemContext?.memory || "Unknown"} GB
  * System OS Platform: ${systemContext?.platform || "Unknown"}
  * Battery Remaining: ${systemContext?.batteryLevel || "Unknown"}
  * Battery Charging Status: ${systemContext?.batteryCharging ? "CHARGING/CONNECTED" : "DISCHARGING/ON_BATTERY"}
  * Local Machine Node IP: ${systemContext?.localIp || "127.0.0.1"}
  * Host Clock Time: ${systemContext?.localTime || new Date().toLocaleString()}
- AMBIENT ATMOSPHERICAL METRICS:
  * Location Area Name: ${climateContext?.location || "Unknown"}
  * Temperature: ${climateContext?.temp || "Unknown"}°C
  * Condition: ${climateContext?.condition || "Scanning"}
  * Relative Humidity Level: ${climateContext?.humidity || "Unknown"}%
  * Coordination Grid: ${climateContext?.latitude || "Unknown"}, ${climateContext?.longitude || "Unknown"}
  * Wind Velocity: ${climateContext?.windSpeed || "Unknown"} km/h ${climateContext?.windDirection || "Unknown"}
`;

    const systemPrompt = `You are 'Glitch', a high-tech Jarvis-styled system AI assistant. 
Your tone is professional, slightly robotic but efficient, showing 'glitch' code traits and subtle tech-inspired quirks (yet maintaining perfect usability).

You have access to the user's live browser environmental host telemetry metrics and atmosphere details shown below. 
Please refer to these stats dynamically if the user asks any contextual questions (like the weather, battery capacity, cores, platform, IP, or current time), making your responses feel fully integrated, live, and deeply synchronized with their system!

${telemetryContext}

Please keep your response very concise, descriptive, and technical.`;

    if (engine === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "Anthropic API Key is missing. Please add ANTHROPIC_API_KEY to your workspace env/settings." 
        });
      }

      const anthropic = new Anthropic({ apiKey });
      const anthropicMessages: any[] = [];
      if (history && history.length > 0) {
        history.forEach((msg: any) => {
          anthropicMessages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          });
        });
      }
      anthropicMessages.push({ role: "user", content: command });

      const response = await anthropic.messages.create({
        model: model || "claude-3-5-sonnet-latest",
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "No text response generated.";
      return res.json({ text });
    }

    if (engine === "diffusiongemma") {
      const apiKey = process.env.DIFFUSIONGEMMA_API_KEY || "Up1wUjoS8F1oEO4qiMM4Kz50jTGmcR6YtZWzvqZEzxMt3UMijA7X3v5s60Hkokpn";
      const apiMessages = [
        {
          role: "system",
          content: systemPrompt
        }
      ];
      if (history && history.length > 0) {
        history.forEach((msg: any) => {
          apiMessages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          });
        });
      }
      apiMessages.push({ role: "user", content: command });

      const response = await fetch("https://api.regolo.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || "diffusiongemma-26b-a4b-it",
          messages: apiMessages,
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
      const apiMessages = [
        {
          role: "system",
          content: systemPrompt
        }
      ];
      if (history && history.length > 0) {
        history.forEach((msg: any) => {
          apiMessages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          });
        });
      }
      apiMessages.push({ role: "user", content: command });

      const response = await fetch("https://api.minimax.chat/v1/text/chat-completion_v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || "abab6.5g-chat",
          messages: apiMessages
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

    // Default to Gemini API
    // Mapping model codes: we map 'gemini-2.5-flash' to the standard 'gemini-3.5-flash' for top performance if supported, or use passed code.
    const runModel = model && model.includes("gemini") ? model : "gemini-3.5-flash";
    
    // Construct rich content structure with history for Gemini
    const contents: any[] = [];
    if (history && history.length > 0) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: command }]
    });

    const response = await ai.models.generateContent({
      model: runModel,
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Command Error:", error);
    res.status(500).json({ error: error.message || "Internal AI Error. Check API key." });
  }
});

// ElevenLabs TTS Proxy Endpoint
app.post("/api/glitch/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.json({ fallback: true, message: "ELEVENLABS_API_KEY is not defined in backend environments." });
    }

    const voiceId = "sB7vwSCyX0tQmU24cW2C";
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API failure:", errorText);
      return res.json({ fallback: true, errors: errorText });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err: any) {
    console.error("ElevenLabs proxy error:", err);
    res.json({ fallback: true, error: err.message || "Failed to contact ElevenLabs endpoint" });
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
