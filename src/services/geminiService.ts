import { GoogleGenAI } from "@google/genai";
import { AI_SCHEMA, UserProfile, CarRecommendation, AIResponse } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateCarImage(carName: string, angle: string = "3/4 front", specs: string[] = [], retries = 1): Promise<string> {
  // Use only 2.5-flash-image as requested by user
  const models = ['gemini-2.5-flash-image'];
  
  const specsText = specs.length > 0 ? `. Key features: ${specs.join(', ')}` : '';
  
  for (let i = 0; i <= retries; i++) {
    const model = models[i % models.length];
    try {
      if (i === 0) await delay(Math.random() * 300);

      console.log(`[ImageGen] Requesting: ${carName} (${angle}), attempt ${i+1} using ${model}`);
      
      const config: any = {
        imageConfig: {
          aspectRatio: "16:9"
        }
      };

      const response = await Promise.race([
        genAI.models.generateContent({
          model: model,
          contents: {
            parts: [{ 
              text: `Professional high-end automotive studio photography of a ${carName}${specsText}. ${angle} view. Clean minimalist white studio background, soft cinematic studio lighting with realistic reflections, 8k resolution, photorealistic, highly detailed, sharp focus, centered composition, no people, professional commercial style. NO TEXT, NO LABELS, NO DESCRIPTIONS, NO WATERMARKS, NO TYPOGRAPHY.` 
            }]
          },
          config: config
        }),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), 25000)
        )
      ]);

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData);
      
      if (imagePart?.inlineData) {
        console.log(`[ImageGen] SUCCESS for ${carName} using ${model}`);
        return `data:image/png;base64,${imagePart.inlineData.data}`;
      }
      
      console.warn(`[ImageGen] No image data from ${model}. FinishReason: ${candidate?.finishReason}`);
    } catch (error: any) {
      console.error(`[ImageGen] Error for ${carName} using ${model}:`, error.message || JSON.stringify(error));
      
      if (error.message === "TIMEOUT") {
        console.warn(`[ImageGen] Timeout for ${model}. Skipping retries for this car.`);
        break; // Don't retry on timeout
      }

      const errorStr = JSON.stringify(error).toLowerCase();
      
      if (error?.status === 403 || errorStr.includes("403") || errorStr.includes("forbidden")) {
        console.warn(`[ImageGen] Model ${model} is forbidden (403).`);
        if (i < retries) continue;
      }

      if ((errorStr.includes("quota") || errorStr.includes("429")) && i < retries) {
        const waitTime = (i + 1) * 2000;
        await delay(waitTime);
        continue;
      }
      
      break;
    }
  }
  return `https://loremflickr.com/800/450/car,${carName.replace(/\s+/g, ',')}`;
}

/**
 * 5. IMAGE GENERATION (Client-side)
 */
async function generateCarImages(car: { name: string; year: string; specs?: string[] }, limit: number = 1): Promise<string[]> {
  const allAngles = ["3/4 front", "side", "rear"];
  const angles = allAngles.slice(0, limit);
  const images: string[] = [];
  const fullName = `${car.year} ${car.name}`;

  for (const angle of angles) {
    const img = await generateCarImage(fullName, angle, car.specs || []);
    if (img && !img.includes('loremflickr')) {
      images.push(img);
    }
    // Small delay between angles if we generate more than one
    if (angles.length > 1) await delay(1500);
  }

  return images;
}

/**
 * 4. MAIN FUNCTION: getCarImages
 */
export async function getCarImages(car: { name: string; year: string; specs?: string[] }, limit: number = 1): Promise<string[]> {
  try {
    console.log("Generating images for:", car.name);
    const generatedImages = await generateCarImages(car, limit);
    
    if (generatedImages.length === 0) {
      return [`https://loremflickr.com/800/450/car,${car.name.replace(/\s+/g, ',')}`];
    }

    return generatedImages;
  } catch (error) {
    console.error("Error in getCarImages (Gemini):", error);
    return [`https://loremflickr.com/800/450/car,${car.name.replace(/\s+/g, ',')}`];
  }
}

export async function analyzeCars(profile: UserProfile, retries = 3): Promise<AIResponse> {
  // Use flash for speed
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Jūs esate AutoMind, ekspertas automobilių konsultantas. 
    Remdamiesi šiuo vartotojo profiliu, rekomenduokite geriausią automobilį ir 2 alternatyvas.
    VISI atsakymai (pavadinimai, paaiškinimai, specifikacijos) PRIVALO būti lietuvių kalba.
    
    Vartotojo profilis:
    - Biudžetas: ${profile.budget} €
    - Pageidaujami tipai: ${profile.carType.join(', ')}
    - Pagrindinis naudojimas: ${profile.usage}
    - Pagrindiniai prioritetai: ${profile.priority.join(', ')}
    - Kuro tipas: ${profile.fuelType}
    ${profile.brandPreference ? `- Prekės ženklo pirmenybė: ${profile.brandPreference}` : ''}
    - Metų rėžis: nuo ${profile.minYear} iki ${profile.maxYear}
    
    Reikalavimai:
    1. Pateikite 1 „Geriausią atitikmenį“ ir 2 alternatyvas.
    2. Kiekvienam automobiliui nurodykite pavadinimą, numatomą kainą (tik skaičius ir € ženklas, pvz. „15 400 €“), metus, rida ir žmogišką paaiškinimą, kodėl jis tinka vartotojo poreikiams.
    3. SVARBU: Kainos PRIVALO atitikti Lietuvos rinką (naudokite Autoplius.lt ir Autogidas.lt duomenis kaip pagrindą).
    4. Kiekvienam automobiliui pateikite „specs“ masyvą su 5-7 pagrindinėmis techninėmis detalėmis lietuvių kalba (pvz., „Variklis: 2.0L Dyzelinas“, „Galia: 140 kW“, „Vidutinės sąnaudos: 5.5 l/100km“).
    5. Užtikrinkite, kad kainos būtų realistiškos nurodytam biudžetui Lietuvos rinkoje.
    6. Venkite blogų sandorių ar nepatikimų modelių.
    7. Kaina visada turi būti nurodyta su € ženklu pabaigoje.
  `;

  let lastError: any = null;
  
  for (let i = 0; i <= retries; i++) {
    const useSearch = i === 0; 

    try {
      const response = await genAI.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: AI_SCHEMA,
          tools: useSearch ? [{ googleSearch: {} }] : []
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      const data = JSON.parse(text);
      const recommendations = data.recommendations as CarRecommendation[];

      // Generate images in parallel
      const imagePromises = recommendations.map(async (car, index) => {
        try {
          // Very small stagger to avoid hitting the RPM limit
          await delay(index * 800);
          
          console.time(`ImageGen-${car.name}`);
          const images = await getCarImages({ name: car.name, year: car.year, specs: car.specs }, 1);
          console.timeEnd(`ImageGen-${car.name}`);

          return { 
            ...car, 
            imageUrl: images[0], 
            images: images 
          };
        } catch (err) {
          console.warn(`Image generation failed or timed out for ${car.name}:`, err);
          const placeholder = `https://loremflickr.com/800/450/car,${car.name.replace(/\s+/g, ',')}`;
          return {
            ...car,
            imageUrl: placeholder,
            images: [placeholder]
          };
        }
      });

      const recommendationsWithImages = await Promise.all(imagePromises);
      return { recommendations: recommendationsWithImages };
    } catch (error: any) {
      lastError = error;
      const isQuotaError = 
        error?.message?.toLowerCase().includes("quota") || 
        error?.status === "RESOURCE_EXHAUSTED" || 
        error?.code === 429 ||
        JSON.stringify(error).toLowerCase().includes("quota");

      if (isQuotaError && i < retries) {
        const waitTime = 2000 + Math.random() * 1000;
        console.warn(`Quota exceeded for analysis, retrying in ${Math.round(waitTime)}ms...`);
        await delay(waitTime);
        continue;
      }
      break;
    }
  }

  console.error("AI Analysis Final Error:", lastError);
  throw lastError;
}
