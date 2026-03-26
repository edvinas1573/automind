import { GoogleGenAI, Modality } from "@google/genai";
import { AI_SCHEMA, UserProfile, CarRecommendation, AIResponse } from "../types";
import { db, storage, auth } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { signInAnonymously } from "firebase/auth";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateCarImage(carName: string, angle: string = "3/4 front", retries = 1): Promise<string> {
  // Prioritize 2.5-flash-image as it works with the default environment key
  const models = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'];
  
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

      if (model.includes('3.1')) {
        config.imageConfig.imageSize = "1K";
      }

      const response = await Promise.race([
        genAI.models.generateContent({
          model: model,
          contents: {
            parts: [{ text: `A photo of a ${carName}, ${angle} view.` }]
          },
          config: config
        }),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), 20000)
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
async function generateCarImages(car: { name: string; year: string }, limit: number = 1): Promise<string[]> {
  const allAngles = ["3/4 front", "side", "rear"];
  const angles = allAngles.slice(0, limit);
  const images: string[] = [];
  const fullName = `${car.year} ${car.name}`;

  for (const angle of angles) {
    const img = await generateCarImage(fullName, angle);
    if (img && !img.includes('loremflickr')) {
      images.push(img);
    }
    // Small delay between angles if we generate more than one
    if (angles.length > 1) await delay(1500);
  }

  return images;
}

/**
 * Helper to generate a unique key for a car
 */
function generateCarKey(name: string, year: string) {
  return `${name}-${year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * 4. MAIN FUNCTION: getCarImages (with Firebase caching)
 */
export async function getCarImages(car: { name: string; year: string }, limit: number = 1): Promise<string[]> {
  const carKey = generateCarKey(car.name, car.year);
  let generatedImages: string[] = [];
  
  try {
    // 1. Check Firestore for existing metadata
    const carDocRef = doc(db, "cached_cars", carKey);
    const carDoc = await getDoc(carDocRef);

    if (carDoc.exists()) {
      const data = carDoc.data();
      // If we have enough images cached, return them
      if (data.imageUrls && data.imageUrls.length >= limit) {
        console.log("Using Firebase cached images for:", car.name);
        return data.imageUrls;
      }
    }
  } catch (error) {
    console.warn("Firestore cache read failed, proceeding with generation:", error);
  }

  try {
    // 2. If not -> generate with Gemini
    console.log("Firebase cache miss or insufficient images, generating for:", car.name);
    generatedImages = await generateCarImages(car, limit);
    
    if (generatedImages.length === 0) {
      return [`https://loremflickr.com/800/450/car,${car.name.replace(/\s+/g, ',')}`];
    }

    // 3. Attempt to cache in Firebase, but don't fail if it fails
    try {
      if (!auth.currentUser) {
        // Race sign-in against a 5-second timeout
        await Promise.race([
          signInAnonymously(auth),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Auth timeout")), 5000))
        ]);
      }

      const downloadUrls: string[] = [];
      for (let i = 0; i < generatedImages.length; i++) {
        const storageRef = ref(storage, `cars/${carKey}/${i}.png`);
        await uploadString(storageRef, generatedImages[i], 'data_url');
        const url = await getDownloadURL(storageRef);
        downloadUrls.push(url);
      }

      // 4. Save metadata to Firestore
      const carDocRef = doc(db, "cached_cars", carKey);
      await setDoc(carDocRef, {
        name: car.name,
        year: car.year,
        imageUrls: downloadUrls,
        createdAt: serverTimestamp()
      }, { merge: true });
      
      return downloadUrls;
    } catch (cacheError) {
      console.error("Failed to cache images in Firebase:", cacheError);
      // Return the raw base64 images if caching fails
      return generatedImages;
    }
  } catch (error) {
    console.error("Error in getCarImages (Gemini):", error);
    return [`https://loremflickr.com/800/450/car,${car.name.replace(/\s+/g, ',')}`];
  }
}

/**
 * Admin function to delete car cache (Firestore + Storage)
 */
export async function deleteCarCache(name: string, year: string): Promise<void> {
  const carKey = generateCarKey(name, year);
  
  try {
    // 1. Delete Firestore document
    const carDocRef = doc(db, "cached_cars", carKey);
    await deleteDoc(carDocRef);
    console.log("Firestore metadata deleted for:", carKey);

    // 2. Delete Storage objects
    const storageFolderRef = ref(storage, `cars/${carKey}`);
    const listResult = await listAll(storageFolderRef);
    
    const deletePromises = listResult.items.map(item => deleteObject(item));
    await Promise.all(deletePromises);
    console.log("Storage images deleted for:", carKey);
  } catch (error) {
    console.error("Error deleting car cache:", error);
    throw error;
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
    - Biudžetas: $${profile.budget}
    - Pageidaujami tipai: ${profile.carType.join(', ')}
    - Pagrindinis naudojimas: ${profile.usage}
    - Pagrindiniai prioritetai: ${profile.priority.join(', ')}
    - Kuro tipas: ${profile.fuelType}
    ${profile.brandPreference ? `- Prekės ženklo pirmenybė: ${profile.brandPreference}` : ''}
    - Metų rėžis: nuo ${profile.minYear} iki ${profile.maxYear}
    
    Reikalavimai:
    1. Pateikite 1 „Geriausią atitikmenį“ ir 2 alternatyvas.
    2. Kiekvienam automobiliui nurodykite pavadinimą, numatomą kainą, metus, rida ir žmogišką paaiškinimą, kodėl jis tinka vartotojo poreikiams.
    3. SVARBU: Kainos PRIVALO atitikti Lietuvos rinką (naudokite Autoplius.lt ir Autogidas.lt duomenis kaip pagrindą).
    4. Kiekvienam automobiliui pateikite „specs“ masyvą su 5-7 pagrindinėmis techninėmis detalėmis lietuvių kalba (pvz., „Variklis: 2.0L Dyzelinas“, „Galia: 140 kW“, „Vidutinės sąnaudos: 5.5 l/100km“).
    5. Užtikrinkite, kad kainos būtų realistiškos nurodytam biudžetui Lietuvos rinkoje.
    6. Venkite blogų sandorių ar nepatikimų modelių.
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
          const images = await getCarImages({ name: car.name, year: car.year }, 1);
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
