import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

/**
 * API ROUTES
 */
app.post("/api/generate-image", async (req, res) => {
  const { carName, angle, specs } = req.body;
  
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      console.error("Backend ImageGen Error: API Key is missing in environment");
      return res.status(500).json({ error: "API Key is missing" });
    }

    // Log the first few characters of the key for debugging (safe)
    console.log(`[Backend] Using API Key starting with: ${apiKey.substring(0, 4)}...`);

    const genAI = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-image';
    const specsText = specs && specs.length > 0 ? `. Key features: ${specs.join(', ')}` : '';
    
    const response = await genAI.models.generateContent({
      model: model,
      contents: {
        parts: [{ 
          text: `Professional high-end automotive studio photography of a ${carName}${specsText}. ${angle} view. Clean minimalist white studio background, soft cinematic studio lighting with realistic reflections, 8k resolution, photorealistic, highly detailed, sharp focus, centered composition, no people, professional commercial style. NO TEXT, NO LABELS, NO DESCRIPTIONS, NO WATERMARKS, NO TYPOGRAPHY.` 
        }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);
    
    if (imagePart?.inlineData) {
      return res.json({ data: imagePart.inlineData.data });
    }
    
    res.status(404).json({ error: "No image data generated" });
  } catch (error: any) {
    console.error("Backend ImageGen Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * VITE MIDDLEWARE SETUP
 */
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
