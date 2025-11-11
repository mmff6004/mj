
import { GoogleGenAI, Modality } from "@google/genai";
import type { EditResult, Character } from '../types';

// Gemini API Guidelines: Initialize the client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * A helper function to process API errors and provide user-friendly messages.
 * @param e The caught error.
 * @param context A string describing the action that failed (e.g., "edit the image").
 * @returns This function never returns, it always throws a new error.
 */
const handleApiError = (e: unknown, context: string): never => {
  console.error(`Error during '${context}':`, e);
  const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';

  // Check for specific keywords indicating network or server issues.
  if (
    errorMessage.includes('xhr error') ||
    errorMessage.includes('500') ||
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('failed to fetch') ||
    errorMessage.includes('Requested entity was not found.') // Specific for Veo key errors
  ) {
    throw new Error(errorMessage); // Rethrow specific errors for the UI to handle
  }

  // Check for common API errors like safety violations.
  if (errorMessage.toLowerCase().includes('safety')) {
    const detailedMessage = `The request to ${context} was blocked for safety reasons. This can happen due to the prompt, the images used, or their combination.

Please try adjusting your request by:
- Using different images.
- Making your prompt more descriptive.
- Ensuring your request is respectful and avoids potentially sensitive topics.`;
    throw new Error(detailedMessage);
  }

  // Generic fallback for other errors.
  throw new Error(`Failed to ${context}: An unexpected error occurred. Please check the console for more details.`);
};

const getFaithfulnessInstruction = (faithfulness: number): string => {
  if (faithfulness <= 20) {
    return "The character's likeness is a loose inspiration; prioritize creativity.";
  }
  if (faithfulness <= 40) {
    return "The output should resemble the character, but creative interpretation is allowed.";
  }
  if (faithfulness <= 60) {
    return "The output should be a clear representation of the character.";
  }
  if (faithfulness <= 80) {
    return "A very close and accurate likeness of the character is required. Minor deviations are acceptable if necessary.";
  }
  return "It is CRITICAL that the result is an EXACT, photorealistic match to the character's likeness. Prioritize faithfulness above all other instructions.";
};


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
 * @param faithfulness A number from 0-100 indicating character faithfulness.
 * @param additionalImage An optional second image to incorporate into the edit.
 * @returns A promise that resolves to an EditResult object containing the new image and text.
 */
export const editImage = async (
  imageBase64: string,
  mimeType: string,
  prompt: string,
  character: Character | null | undefined,
  faithfulness: number,
  additionalImage?: { base64: string; mimeType: string } | null
): Promise<EditResult> => {
  try {
    const model = 'gemini-2.5-flash-image';
    const imageParts = [];
    const textParts = [];

    // Handle character reference image
    if (character?.referenceImageBase64) {
      const charMimeType = character.referenceImageMimeType || 'image/png';
      imageParts.push(fileToGenerativePart(character.referenceImageBase64, charMimeType));
    }
    
    // Handle additional image
    if (additionalImage) {
      imageParts.push(fileToGenerativePart(additionalImage.base64, additionalImage.mimeType));
    }

    // Add the main target image
    imageParts.push(fileToGenerativePart(imageBase64, mimeType));

    // Construct the instruction prompt text
    const imageRoles = [];
    let imageCounter = 1;
    if (character?.referenceImageBase64) {
      imageRoles.push(`- The IMAGE #${imageCounter++} is a REFERENCE image for the character named '${character.name}'.`);
    }
    if (additionalImage) {
      imageRoles.push(`- The IMAGE #${imageCounter++} is an ELEMENT to incorporate into the scene.`);
    }
    imageRoles.push(`- The IMAGE #${imageCounter++} is the TARGET image to be edited.`);

    const characterDetails = character ? `\n**CHARACTER DETAILS (may be in user's language):** ${character.description}` : '';
    const faithfulnessInstruction = character ? `\n**CHARACTER FAITHFULNESS:** ${getFaithfulnessInstruction(faithfulness)}` : '';

    const instructionText = `
    **TASK:** You are an expert multilingual image editor and digital artist specializing in photorealistic and cinematic compositions. Edit the TARGET image based on the user's instruction.

    **STYLE:** The final image MUST be photorealistic. Do not produce cartoons, illustrations, or paintings. The style should be that of a high-end photograph.

    **MOST IMPORTANT RULE: LIGHTING HARMONY.** Your primary goal is to make the final image look completely real and not like a composite. The lighting on any added or modified element (like a character) MUST perfectly match the lighting of the background/scene. Failure to do so creates a fake-looking image.

    **Step-by-step lighting process:**
    1.  **Analyze the Scene:** First, carefully analyze the lighting in the TARGET image. Identify the direction, color (temperature), and softness/hardness of all primary and secondary light sources.
    2.  **Apply to Subject:** Re-light any added character or element to match this analysis. This includes:
        - **Key Light:** The main light source must hit the subject from the same angle and with the same quality as in the scene.
        - **Fill Light & Shadows:** Shadows cast by the subject must be in the correct direction, and the darkness of the shadows should match the scene's ambient light.
        - **Rim Light:** If the scene has backlighting, create appropriate rim lighting on the subject.
        - **Color Bleed:** The subject should pick up subtle color reflections from the surrounding environment. For example, a character in a golden room should have warm, golden tints in their highlights and ambient lighting.
    3.  **Seamless Integration:** All elements must be perfectly blended. Pay close attention to perspective, scale, focus/depth of field, and grain/noise matching.
    
    **IMAGE ROLES:**
    ${imageRoles.join('\n')}
    ${characterDetails}
    ${faithfulnessInstruction}
    
    **USER'S INSTRUCTION TO FOLLOW (provided in their native language):**
    `.trim();
    textParts.push({ text: instructionText });
    
    // Add the user prompt as the final text part
    textParts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [...imageParts, ...textParts] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let editedImageBase64: string | null = null;
    let editedText: string | null = null;
    let responseMimeType: string | undefined = undefined;

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                editedImageBase64 = part.inlineData.data;
                responseMimeType = part.inlineData.mimeType;
            } else if (part.text) {
                editedText = part.text;
            }
        }
    }

    if (editedImageBase64) {
      return { editedImageBase64, editedText, mimeType: responseMimeType };
    }
    
    throw new Error("API did not return an image. This could be due to a safety block. Please try a different prompt.");

  } catch (e) {
    handleApiError(e, 'edit the image');
  }
};


/**
 * Generates an image using the Gemini API based on a text prompt.
 * @param prompt The text prompt describing the desired image.
 * @param aspectRatio The desired aspect ratio for the image.
 * @param character An optional Character object for consistency.
 * @param faithfulness A number from 0-100 indicating character faithfulness.
 * @returns A promise that resolves to an EditResult object.
 */
export const generateImage = async (
  prompt: string,
  aspectRatio: string,
  character: Character | null | undefined,
  faithfulness: number
): Promise<EditResult> => {
  try {
    if (character?.referenceImageBase64) {
      const model = 'gemini-2.5-flash-image';
      
      const faithfulnessInstruction = getFaithfulnessInstruction(faithfulness);

      const instructionText = `
        **TASK:** You are a master multilingual artist specializing in photorealistic and cinematic compositions. Create a new image featuring the character from the REFERENCE image, placed in a new scene based on the user's instruction. The final image should have a ${aspectRatio} aspect ratio.

        **STYLE:** The final image MUST be photorealistic. Do not produce cartoons, illustrations, or paintings. The style should be that of a high-end photograph.

        **MOST IMPORTANT RULE: LIGHTING HARMONY.** Your primary goal is to make the final image look completely real and not like a composite. The character MUST be lit by the environment you create. They cannot look "pasted on".

        **CRITICAL INSTRUCTIONS:**
        1.  **Unified Lighting:** The character and the scene must appear to be photographed with the same camera, at the same time, in the same location. They MUST share a single, cohesive lighting environment.
        2.  **Environmental Interaction:** The light from the scene (e.g., sunlight, city lights, candles) must realistically fall on the character.
            - Shadows cast by the character must match the direction and softness of shadows in the scene.
            - The character should pick up "color bleed" - subtle color reflections from their surroundings.
            - The overall color temperature and mood of the lighting must be consistent across the entire image.
        3.  **Seamless Integration:** Ensure the character is perfectly blended into the scene regarding perspective, scale, focus/depth of field, and image grain/noise.

        **REFERENCE IMAGE:** The provided image is a reference for the character '${character.name}'.
        
        **CHARACTER DETAILS (may be in user's language):** ${character.description}

        **CHARACTER FAITHFULNESS:** ${faithfulnessInstruction}

        **USER'S INSTRUCTION TO FOLLOW (provided in their native language):**
      `.trim();
      
      const mimeType = character.referenceImageMimeType || 'image/png';
      
      const parts = [
        fileToGenerativePart(character.referenceImageBase64, mimeType),
        { text: instructionText },
        { text: prompt }
      ];

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: parts },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      let editedImageBase64: string | null = null;
      let editedText: string | null = null;
      let responseMimeType: string | undefined = undefined;


      if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            editedImageBase64 = part.inlineData.data;
            responseMimeType = part.inlineData.mimeType;
          } else if (part.text) {
            editedText = part.text;
          }
        }
      }

      if (!editedImageBase64) {
        throw new Error("API did not return an image for character generation.");
      }
      return { editedImageBase64, editedText, mimeType: responseMimeType };

    } else {
      const model = 'imagen-4.0-generate-001';
      
      const fullPrompt = `
        **PRIMARY DIRECTIVE:** Create a photorealistic image that looks like a real photograph taken with a high-end camera (e.g., a DSLR or mirrorless camera with a prime lens).

        **STYLE & AESTHETIC:**
        - **Hyperrealism:** The image MUST be indistinguishable from a real-world photograph.
        - **Cinematic Quality:** Employ sophisticated lighting techniques, including soft key lights, subtle fill lights, and rim lighting to create depth and mood. The lighting must be natural and believable for the scene.
        - **Professional Photography:** Emulate the quality of professional photography. This includes realistic depth of field (bokeh), natural film grain (not digital noise), and perfect focus on the main subject.

        **ABSOLUTE PROHIBITIONS (DO NOT DO THE FOLLOWING):**
        - **NO Cartoons, Anime, or Illustrations:** Do not generate any form of non-photorealistic art.
        - **NO Paintings or Digital Art Styles:** The image must not look like it was painted or created with digital art software.
        - **NO Unrealistic Features:** Avoid plastic-looking skin, exaggerated proportions, or unnatural colors unless specifically requested.
        - **NO "Uncanny Valley":** Ensure human subjects look completely natural and lifelike.

        **USER'S INSTRUCTION (Interpret and execute with maximum realism):** ${prompt}
      `.trim();
      
      const outputMimeType = 'image/png';
      const response = await ai.models.generateImages({
        model,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
          outputMimeType,
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("API did not return any images.");
      }

      const imageBase64 = response.generatedImages[0].image.imageBytes;
      return { editedImageBase64: imageBase64, editedText: null, mimeType: outputMimeType };
    }
  } catch (e) {
    handleApiError(e, 'generate the image');
  }
};


/**
 * Upscales an image using the Gemini API.
 * @param imageBase64 The base64 encoded string of the image to upscale.
 * @param mimeType The mime type of the image.
 * @returns A promise that resolves to an EditResult object.
 */
export const upscaleImage = async (imageBase64: string, mimeType: string): Promise<EditResult> => {
    try {
        const model = 'gemini-2.5-flash-image';

        const prompt = `
        **Role:** You are an expert photo retoucher and digital artist.
        **Task:** Upscale the provided image into a hyperrealistic, high-resolution, 8k photograph with cinematic lighting.
        **Instructions:**
        - If the original image is stylized (e.g., cartoon, anime), reimagine it as a real photograph.
        - Enhance details, lighting, and textures for maximum realism. The lighting should be cohesive and cinematic.
        - Correct any imperfections and increase overall clarity.
        - The final output must be a single, high-quality upscaled image.
        `.trim();
        
        const parts = [
            fileToGenerativePart(imageBase64, mimeType),
            { text: prompt }
        ];

        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: parts },
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        });

        let editedImageBase64: string | null = null;
        let editedText: string | null = null;
        let responseMimeType: string | undefined = undefined;

        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    editedImageBase64 = part.inlineData.data;
                    responseMimeType = part.inlineData.mimeType;
                } else if (part.text) {
                    editedText = part.text;
                }
            }
        }

        if (editedImageBase64) {
          return { editedImageBase64, editedText, mimeType: responseMimeType };
        }
        
        throw new Error("API did not return an image after upscaling. This might be a safety block.");

    } catch (e) {
        handleApiError(e, 'upscale the image');
    }
};

/**
 * Generates a character portrait image using the Gemini API.
 * @param description The text prompt describing the character.
 * @param referenceImages An array of reference images.
 * @returns A promise that resolves to an EditResult object.
 */
export const generateCharacterImage = async (
  description: string,
  referenceImages: { data: string; mimeType: string }[]
): Promise<EditResult> => {
  try {
    // If there are no reference images, use the standard image generation model.
    if (referenceImages.length === 0) {
      const model = 'imagen-4.0-generate-001';
      const fullPrompt = `
        Create a photorealistic, full-body portrait of a single character with cinematic studio lighting. The style must be that of a real, high-end photograph, not an illustration or cartoon. The following description is provided in the user's native language, which you must understand and follow.
        **DESCRIPTION:** ${description}
      `.trim();
      
      const outputMimeType = 'image/png';
      const response = await ai.models.generateImages({
        model,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: "9:16", // Portraits are often taller
          outputMimeType,
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("API did not return any images for character portrait generation.");
      }

      const imageBase64 = response.generatedImages[0].image.imageBytes;
      return { editedImageBase64: imageBase64, editedText: null, mimeType: outputMimeType };
    }
    
    // If there ARE reference images, use the multi-modal model.
    const model = 'gemini-2.5-flash-image';

    const instructionText = `
      **TASK:** You are a multilingual character concept artist. Synthesize a *single* new character portrait. This new character should be a cohesive and believable person that creatively combines the most prominent features (like face structure, hair style, and overall likeness) from ALL the provided reference images. The final image should be a full-body, photorealistic portrait with dramatic, cinematic studio lighting.
      
      **STYLE:** The final image MUST be photorealistic. Do not produce cartoons, illustrations, or paintings. The style should be that of a high-end photograph.

      **USER'S CHARACTER DESCRIPTION (in their native language):**
    `.trim();

    const parts = [
      ...referenceImages.map(img => fileToGenerativePart(img.data, img.mimeType)),
      { text: instructionText },
      { text: description },
    ];

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let editedImageBase64: string | null = null;
    let editedText: string | null = null;
    let mimeType: string | undefined = undefined;

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          editedImageBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType;
        } else if (part.text) {
          editedText = part.text;
        }
      }
    }

    if (!editedImageBase64) {
      throw new Error("API did not return an image for the character portrait. This could be due to a safety block.");
    }

    return { editedImageBase64, editedText, mimeType };

  } catch (e) {
    handleApiError(e, 'generate the character portrait');
  }
};

/**
 * Generates a new outfit for a character.
 * @param character The character to generate the outfit for.
 * @param outfitPrompt The description of the new outfit.
 * @param faithfulness A number from 0-100 indicating character faithfulness.
 * @returns A promise that resolves to an EditResult object.
 */
export const generateOutfitForCharacter = async (
  character: Character,
  outfitPrompt: string,
  faithfulness: number
): Promise<EditResult> => {
  if (!character.referenceImageBase64) {
    throw new Error("Character must have a reference image to generate outfits.");
  }
  
  try {
    const model = 'gemini-2.5-flash-image';
    
    const faithfulnessInstruction = getFaithfulnessInstruction(faithfulness);

    const instructionText = `
      **TASK:** You are a master fashion designer and digital artist. Redraw the character from the REFERENCE image, but dress them in a completely new outfit as described by the user. The background should be a simple, neutral studio backdrop unless specified otherwise by the user.

      **STYLE:** The final image MUST be photorealistic. Do not produce cartoons, illustrations, or paintings. The style should be that of a high-end photograph.

      **CRITICAL INSTRUCTIONS:**
      1.  **Likeness:** The character's face, body, and likeness must be preserved according to the faithfulness instruction.
      2.  **Cohesive Lighting:** The final image must be a full-body portrait with a 9:16 aspect ratio, featuring professional, cinematic studio lighting. The lighting on the character and the new outfit must be perfectly cohesive and come from the same light source(s) to create a realistic and harmonious portrait.
      
      **REFERENCE IMAGE:** The provided image is a reference for the character '${character.name}'.
      
      **CHARACTER DETAILS:** ${character.description}

      **CHARACTER FAITHFULNESS:** ${faithfulnessInstruction}

      **USER'S OUTFIT DESCRIPTION (provided in their native language):**
    `.trim();
    
    const mimeType = character.referenceImageMimeType || 'image/png';
    const parts = [
      fileToGenerativePart(character.referenceImageBase64, mimeType),
      { text: instructionText },
      { text: outfitPrompt }
    ];

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let editedImageBase64: string | null = null;
    let editedText: string | null = null;
    let responseMimeType: string | undefined = undefined;

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          editedImageBase64 = part.inlineData.data;
          responseMimeType = part.inlineData.mimeType;
        } else if (part.text) {
          editedText = part.text;
        }
      }
    }

    if (!editedImageBase64) {
      throw new Error("API did not return an image for the outfit generation.");
    }
    return { editedImageBase64, editedText, mimeType: responseMimeType };

  } catch (e) {
    handleApiError(e, 'generate outfit for the character');
  }
};

/**
 * Generates a video using the Gemini API.
 * @param prompt The text prompt describing the desired video.
 * @param image An optional image to use as a starting point.
 * @param aspectRatio The desired aspect ratio for the video.
 * @returns A promise that resolves to an object containing the video URL and the original prompt.
 */
export const generateVideo = async (
  prompt: string,
  image: { base64: string; mimeType: string } | null | undefined,
  aspectRatio: string
): Promise<{ videoUrl: string, prompt: string }> => {
  try {
    const model = 'veo-3.1-fast-generate-preview';

    // The Veo API needs a new GoogleGenAI instance to pick up the key from the dialog
    const veaAi = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    let operation = await veaAi.models.generateVideos({
      model: model,
      prompt: `**TASK:** You are a master multilingual filmmaker. Create a short, cinematic, photorealistic video based on the user's prompt. Pay close attention to lighting, mood, and high-quality visuals.
      
      **USER'S PROMPT (in their native language):** ${prompt}`,
      ...(image && {
        image: {
          imageBytes: image.base64,
          mimeType: image.mimeType,
        }
      }),
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio as '16:9' | '9:16',
      }
    });

    // Poll for the result
    while (!operation.done) {
      // Wait for 10 seconds before checking the status again.
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await veaAi.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (downloadLink) {
      return { videoUrl: downloadLink, prompt };
    }

    throw new Error("Video generation completed, but no download link was provided.");

  } catch (e) {
    handleApiError(e, 'generate the video');
  }
};
