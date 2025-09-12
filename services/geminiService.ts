import { GoogleGenAI, Modality } from "@google/genai";
import type { EditResult } from '../types';

// Gemini API Guidelines: Initialize the client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Converts a base64 string and mime type to a GenerativePart object for the API.
 * @param base64 The base64 encoded image data.
 * @param mimeType The IANA mime type of the image.
 * @returns A GenerativePart object.
 */
const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

/**
 * Edits an image using the Gemini API based on a text prompt.
 * @param imageBase64 The base64 encoded string of the image to edit.
 * @param mimeType The mime type of the image.
 * @param prompt The text prompt describing the desired edits.
 * @param characterReferenceImage An optional base64 encoded image of a character for consistency.
 * @returns A promise that resolves to an EditResult object containing the new image and text.
 */
export const editImage = async (
  imageBase64: string,
  mimeType: string,
  prompt: string,
  characterReferenceImage?: string | null
): Promise<EditResult> => {
  try {
    const model = 'gemini-2.5-flash-image-preview';
    const parts = [
        fileToGenerativePart(imageBase64, mimeType),
        { text: prompt }
    ];

    if (characterReferenceImage) {
        parts.unshift(fileToGenerativePart(characterReferenceImage, 'image/png'));
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let editedImageBase64: string | null = null;
    let editedText: string | null = null;
    
    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                editedImageBase64 = part.inlineData.data;
            } else if (part.text) {
                editedText = part.text;
            }
        }
    }

    if (!editedImageBase64) {
      throw new Error("API did not return an image. Please try a different prompt.");
    }

    return { editedImageBase64, editedText };

  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    throw new Error(`Failed to edit image: ${errorMessage}`);
  }
};


/**
 * Generates an image using the Gemini API based on a text prompt.
 * @param prompt The text prompt describing the desired image.
 * @param characterReferenceImage An optional base64 encoded image of a character for consistency.
 * @returns A promise that resolves to an EditResult object containing the new image.
 */
export const generateImage = async (prompt: string, characterReferenceImage?: string | null): Promise<EditResult> => {
  try {
    // If a character reference image is provided, we must use the multimodal model.
    if (characterReferenceImage) {
        const model = 'gemini-2.5-flash-image-preview';
        const parts = [
            fileToGenerativePart(characterReferenceImage, 'image/png'),
            { text: `Generate a new scene based on this character. Prompt: ${prompt}` }
        ];

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        let editedImageBase64: string | null = null;
        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    editedImageBase64 = part.inlineData.data;
                }
            }
        }
        if (!editedImageBase64) {
          throw new Error("API did not return an image from multimodal generation.");
        }
        return { editedImageBase64, editedText: null };
    }
    
    // Otherwise, use the dedicated image generation model.
    const model = 'imagen-4.0-generate-001';
    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
      },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("API did not return an image. Please try a different prompt.");
    }

    const generatedImageBase64 = response.generatedImages[0].image.imageBytes;
    return { editedImageBase64: generatedImageBase64, editedText: null };

  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
};


/**
 * Generates a character portrait using reference images and a description.
 * @param description The detailed text description of the character.
 * @param referenceImages An array of base64 encoded reference images.
 * @returns A promise that resolves to an EditResult object with the generated portrait.
 */
export const generateCharacterImage = async (
    description: string,
    referenceImages: { data: string; mimeType: string }[]
): Promise<EditResult> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';

        // Fix: The 'parts' array for generateContent must be initialized with all possible object shapes
        // (e.g., image parts and text parts) at once. This allows TypeScript to correctly infer the
        // union type for the array elements. Pushing a different shape after initialization causes a type error.
        const parts = [
            ...referenceImages.map(img => fileToGenerativePart(img.data, img.mimeType)),
            { text: `Create a definitive, high-quality character portrait based on the provided reference images and this description: ${description}. The character should be facing forward in a neutral pose. The background should be simple.` }
        ];

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        let editedImageBase64: string | null = null;
        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    editedImageBase64 = part.inlineData.data;
                }
            }
        }

        if (!editedImageBase64) {
            throw new Error("Failed to generate a character portrait from the provided details.");
        }

        return { editedImageBase64, editedText: null };

    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        throw new Error(`Failed to create character image: ${errorMessage}`);
    }
};