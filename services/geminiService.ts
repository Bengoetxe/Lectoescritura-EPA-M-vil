import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GameItem, Syllable } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a list of words for the game.
 */
async function generateWordList(syllables: Syllable[], excludeWords: string[] = []): Promise<{ word: string; syllable: Syllable }[]> {
  const model = "gemini-2.5-flash";
  
  // Create a readable string of syllables for the prompt
  const syllablesStr = syllables.map(s => `'${s}'`).join(', ');
  const excludeStr = excludeWords.length > 0 ? excludeWords.join(', ') : "ninguna";

  const prompt = `
    Genera una lista de 5 palabras en español para niños. Son sustantivos tangibles que se pueden dibujar.
    Debe haber exactamente una palabra que empiece por cada una de estas sílabas: ${syllablesStr}.
    
    IMPORTANTE:
    1. Las palabras NO pueden ser ninguna de estas (ya se han usado): ${excludeStr}.
    2. Busca palabras variadas y divertidas.
    3. Devuelve solo el JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  syllable: { type: Type.STRING },
                },
                required: ["word", "syllable"],
              },
            },
          },
        },
      },
    });

    const json = JSON.parse(response.text || "{}");
    
    // Validate items
    const validatedItems = json.items.map((item: any) => ({
        word: item.word,
        syllable: item.syllable.toLowerCase() as Syllable
    }));

    return validatedItems;
  } catch (error) {
    console.error("Error generating word list:", error);
    // Fallback logic in case of API failure
    const firstLetter = syllables[0].charAt(0);
    return syllables.map(s => ({
        word: `${s.toUpperCase()}... (Error)`,
        syllable: s
    }));
  }
}

/**
 * Generates an image for a specific word.
 */
async function generateImageForWord(word: string): Promise<string> {
  const model = "gemini-2.5-flash-image"; // Fast and good enough for drawings
  const prompt = `Un dibujo simple, colorido, infantil, estilo vector, trazo grueso, fondo blanco, de: ${word}. Aislado, sin texto.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    // Check parts for image data
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found");
  } catch (error) {
    console.error(`Error generating image for ${word}:`, error);
    return `https://placehold.co/400x400?text=${word}`; // Fallback placeholder
  }
}

/**
 * Generates audio pronunciation for a word.
 */
async function generatePronunciation(word: string): Promise<string | null> {
  const model = "gemini-2.5-flash-preview-tts";
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: word }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error(`Error generating audio for ${word}:`, error);
    return null;
  }
}

/**
 * Main function to prepare the game.
 */
export async function initializeGame(syllables: Syllable[], excludeWords: string[]): Promise<GameItem[]> {
  // 1. Get words
  const words = await generateWordList(syllables, excludeWords);

  // 2. Generate images and audio in parallel
  const itemPromises = words.map(async (w) => {
    const [imageUrl, audioData] = await Promise.all([
      generateImageForWord(w.word),
      generatePronunciation(w.word)
    ]);

    return {
      id: crypto.randomUUID(),
      word: w.word,
      syllable: w.syllable,
      imageUrl: imageUrl,
      isMatched: false,
      audioData: audioData,
    };
  });

  const gameItems = await Promise.all(itemPromises);
  
  // Shuffle the items for the top area
  return gameItems.sort(() => Math.random() - 0.5);
}