import { GoogleGenAI, Modality } from "@google/genai";
import type { EditResult, Character } from '../types';

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
 * @param character An optional Character object for consistency.
 * @returns A promise that resolves to an EditResult object containing the new image and text.
 */
export const editImage = async (
  imageBase64: string,
  mimeType: string,
  prompt: string,
  character?: Character | null
): Promise<EditResult> => {
  try {
    const model = 'gemini-2.5-flash-image-preview';
    let initialPrompt = prompt;

    if (character?.referenceImageBase64) {
        // Construct a prompt that clearly instructs the model on the roles of each image.
        initialPrompt = `The first image provided is a character reference for '${character.name}'. The second image is the one to be edited. Modify the second image according to the prompt, ensuring the character from the first image is present and consistent. Character details: ${character.description}. Prompt: ${prompt}`;
    }

    for (let i = 0; i < 2; i++) {
        let currentPrompt = initialPrompt;
        if (i === 1) { // On retry, add a negative prompt
            currentPrompt += ', negative prompt: (avoiding sensitive, explicit, and unsafe content)';
        }

        const parts = [
            fileToGenerativePart(imageBase64, mimeType),
        ];

        if (character?.referenceImageBase64) {
            parts.unshift(fileToGenerativePart(character.referenceImageBase64, 'image/png'));
        }

        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [...parts, { text: currentPrompt }] },
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        });

        let editedImageBase64: string | null = null;
        let editedText: string | null = null;
        
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    editedImageBase64 = part.inlineData.data;
                } else if (part.text) {
                    editedText = part.text;
                }
            }
        }

        if (editedImageBase64) {
          return { editedImageBase64, editedText };
        }
    }
    
    throw new Error("API did not return an image, even after an automatic retry. This could be due to a safety block. Please try a different prompt.");

  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    throw new Error(`Failed to edit image: ${errorMessage}`);
  }
};


/**
 * Generates an image using the Gemini API based on a text prompt.
 * @param prompt The text prompt describing the desired image.
 * @param aspectRatio The desired aspect ratio for the generated image.
 * @param character An optional Character object for consistency.
 * @returns A promise that resolves to an EditResult object containing the new image.
 */
export const generateImage = async (prompt: string, aspectRatio: string, character?: Character | null): Promise<EditResult> => {
  try {
    for (let i = 0; i < 2; i++) {
        let currentPrompt = prompt;
        if (i === 1) { // On retry, add a negative prompt
            currentPrompt += ', negative prompt: (avoiding sensitive, explicit, and unsafe content)';
        }

        // If a character reference image is provided, we must use the multimodal model.
        if (character?.referenceImageBase64) {
            const model = 'gemini-2.5-flash-image-preview';
            const characterPrompt = `Generate a new image featuring the character '${character.name}' from the provided reference image. The character's key features are: ${character.description}. The scene to generate is: ${currentPrompt}`;
            const parts = [
                fileToGenerativePart(character.referenceImageBase64, 'image/png'),
                { text: characterPrompt }
            ];

            const response = await ai.models.generateContent({
                model: model,
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });

            let editedImageBase64: string | null = null;
            if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        editedImageBase64 = part.inlineData.data;
                    }
                }
            }
            if (editedImageBase64) {
              return { editedImageBase64, editedText: null };
            }
        } else { // Otherwise, use the dedicated image generation model.
            let finalPrompt = currentPrompt;
            if (character) {
              finalPrompt = `Featuring the character '${character.name}' (${character.description}). Prompt: ${currentPrompt}`;
            }
            
            const model = 'imagen-4.0-generate-001';
            const response = await ai.models.generateImages({
              model: model,
              prompt: finalPrompt,
              config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
              },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
              const generatedImageBase64 = response.generatedImages[0].image.imageBytes;
              return { editedImageBase64: generatedImageBase64, editedText: null };
            }
        }
    }
    
    throw new Error("API did not return an image, even after an automatic retry. This could be due to a safety block. Please try a different prompt.");

  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
};


/**
 * Generates a character portrait using a description and optional reference images.
 * @param description The detailed text description of the character.
 * @param referenceImages An optional array of base64 encoded reference images.
 * @returns A promise that resolves to an EditResult object with the generated portrait.
 */
export const generateCharacterImage = async (
    description: string,
    referenceImages?: { data: string; mimeType: string }[]
): Promise<EditResult> => {
    try {
        for (let i = 0; i < 2; i++) {
            let currentDescription = description;
            if (i === 1) { // On retry, add a negative prompt
                currentDescription += ', negative prompt: (avoiding sensitive, explicit, and unsafe content)';
            }

            // Case 1: Prompt + Reference Images (Multimodal)
            if (referenceImages && referenceImages.length > 0) {
                const model = 'gemini-2.5-flash-image-preview';
                const parts = [
                    ...referenceImages.map(img => fileToGenerativePart(img.data, img.mimeType)),
                    { text: `Create a definitive, high-quality character portrait based on the provided reference images and this description: ${currentDescription}. The character should be facing forward in a neutral pose. The background should be simple.` }
                ];

                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts },
                    config: {
                        responseModalities: [Modality.IMAGE, Modality.TEXT],
                    },
                });

                let editedImageBase64: string | null = null;
                if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            editedImageBase64 = part.inlineData.data;
                        }
                    }
                }

                if (editedImageBase64) {
                    return { editedImageBase64, editedText: null };
                }
            }
            // Case 2: Prompt Only (Image Generation)
            else {
                const model = 'imagen-4.0-generate-001';
                const finalPrompt = `A definitive, high-quality character portrait based on this description: ${currentDescription}. The character should be facing forward in a neutral pose. The background should be simple and unobtrusive.`;
                
                const response = await ai.models.generateImages({
                  model: model,
                  prompt: finalPrompt,
                  config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: "1:1",
                  },
                });

                if (response.generatedImages && response.generatedImages.length > 0) {
                  const generatedImageBase64 = response.generatedImages[0].image.imageBytes;
                  return { editedImageBase64: generatedImageBase64, editedText: null };
                }
            }
        }
        
        throw new Error("Failed to generate a character portrait, even after an automatic retry. This could be due to a safety block. Please try again with a different description.");

    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        throw new Error(`Failed to create character image: ${errorMessage}`);
    }
};