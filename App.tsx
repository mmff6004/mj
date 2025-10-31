
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PromptInput } from './components/PromptInput';
import { ResultDisplay } from './components/ResultDisplay';
import { Gallery } from './components/Gallery';
import { CharacterGallery } from './components/CharacterGallery';
import { CharacterCreatorModal } from './components/CharacterCreatorModal';
import { StrengthSlider } from './components/StrengthSlider';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { PaintBrushIcon } from './components/icons/PaintBrushIcon';
import { ArrowUpOnSquareIcon } from './components/icons/ArrowUpOnSquareIcon';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { OutfitGeneratorModal } from './components/LookbookModal';
import { editImage, generateImage, upscaleImage, generateVideo } from './services/geminiService';
import type { EditResult, GalleryItem, Character } from './types';
import { AdditionalImageUploader } from './components/AdditionalImageUploader';
import { fileToBase64 } from './utils/fileUtils';
import { createVideoThumbnail } from './utils/videoUtils';
import { ImageFilter, initialFilterState, type FilterState } from './components/ImageFilter';

type Mode = 'edit' | 'generate' | 'video';

const videoLoadingMessages = [
  "Warming up the video generation engine...",
  "Storyboarding the prompt...",
  "Rendering initial keyframes...",
  "Compositing scenes together...",
  "Applying cinematic motion and effects...",
  "This can take a few minutes, please wait...",
  "Finalizing the video stream...",
  "Almost there, polishing the final cut...",
];


const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [uploadedImageData, setUploadedImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalImageData, setAdditionalImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [additionalImagePreview, setAdditionalImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isApplyingFX, setIsApplyingFX] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EditResult | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isCharCreatorOpen, setIsCharCreatorOpen] = useState(false);
  const [characterToEdit, setCharacterToEdit] = useState<Character | null>(null);
  const [imageFaithfulness, setImageFaithfulness] = useState(50);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [isOutfitGeneratorOpen, setIsOutfitGeneratorOpen] = useState(false);
  const [characterForOutfitGenerator, setCharacterForOutfitGenerator] = useState<Character | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterState>(initialFilterState);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
  const loadingIntervalRef = useRef<number | null>(null);
  const [isKeyReadyForVeo, setIsKeyReadyForVeo] = useState(false);


  // Load characters and gallery from localStorage
  useEffect(() => {
    try {
      const storedCharacters = localStorage.getItem('mj-ai-characters');
      if (storedCharacters) {
        setCharacters(JSON.parse(storedCharacters));
      }
      const storedGallery = localStorage.getItem('mj-ai-gallery');
      if (storedGallery) {
        setGalleryImages(JSON.parse(storedGallery));
      }
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
    }
    // Check for Veo API key on initial load
    if (window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(setIsKeyReadyForVeo);
    }
  }, []);

  // Save characters and gallery to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mj-ai-characters', JSON.stringify(characters));
    } catch (e) {
      console.error("Failed to save characters to localStorage", e);
    }
  }, [characters]);

  useEffect(() => {
    try {
      localStorage.setItem('mj-ai-gallery', JSON.stringify(galleryImages));
    } catch (e) {
      console.error("Failed to save gallery to localStorage", e);
    }
  }, [galleryImages]);

  const selectedCharacter = useMemo(() => {
    return characters.find(c => c.id === selectedCharacterId) ?? null;
  }, [characters, selectedCharacterId]);

  const getCssFilterString = (filters: FilterState): string => {
    return `grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) invert(${filters.invert}%) brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
  };

  const handleImageUpload = useCallback(async (file: File) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setUploadedImageData(null);
    setResult(null);
    setError(null);
    setActiveFilters(initialFilterState);
    
    const newPreview = URL.createObjectURL(file);
    setImagePreview(newPreview);

    try {
      const data = await fileToBase64(file);
      setUploadedImageData(data);
    } catch(e) {
      URL.revokeObjectURL(newPreview);
      setImagePreview(null);
      if (e instanceof Error) {
          setError(`Could not read the uploaded file. Please try selecting it again. (Details: ${e.message})`);
      } else {
          setError('An unexpected error occurred while reading the file.');
      }
    }
  }, [imagePreview]);

  const handleAdditionalImageUpload = useCallback(async (file: File) => {
      if (additionalImagePreview) {
          URL.revokeObjectURL(additionalImagePreview);
      }
      setAdditionalImageData(null);

      const newPreview = URL.createObjectURL(file);
      setAdditionalImagePreview(newPreview);
      
      try {
          const data = await fileToBase64(file);
          setAdditionalImageData(data);
      } catch(e) {
          URL.revokeObjectURL(newPreview);
          setAdditionalImagePreview(null);
          if (e instanceof Error) {
              setError(`Could not read the additional image. Please try selecting it again. (Details: ${e.message})`);
          } else {
              setError('An unexpected error occurred while reading the file.');
          }
      }
  }, [additionalImagePreview]);

  const handleRemoveAdditionalImage = useCallback(() => {
    setAdditionalImageData(null);
    if (additionalImagePreview) {
      URL.revokeObjectURL(additionalImagePreview);
    }
    setAdditionalImagePreview(null);
  }, [additionalImagePreview]);
  
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setResult(null);
    setError(null);
    setPrompt('');
    setUploadedImageData(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        // Assume success to avoid race condition and allow immediate use
        setIsKeyReadyForVeo(true);
    } else {
        setError("API Key selection is not available in this environment.");
    }
  };

  const handleSubmit = async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    if (mode === 'edit' && !uploadedImageData) {
      setError('Please upload an image to edit.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setActiveFilters(initialFilterState);

    try {
      if (mode === 'video') {
        setVideoLoadingMessage(videoLoadingMessages[0]);
        let messageIndex = 1;
        loadingIntervalRef.current = window.setInterval(() => {
          setVideoLoadingMessage(videoLoadingMessages[messageIndex % videoLoadingMessages.length]);
          messageIndex++;
        }, 5000);

        const videoResult = await generateVideo(prompt, uploadedImageData, aspectRatio);
        const fullVideoUrl = `${videoResult.videoUrl}&key=${process.env.API_KEY}`;
        
        const response = await fetch(fullVideoUrl);
        if (!response.ok) {
          throw new Error('Failed to download the generated video file.');
        }
        const videoBlob = await response.blob();
        const blobUrl = URL.createObjectURL(videoBlob);
        
        const { base64: thumbnailBase64, mimeType: thumbnailMimeType } = await createVideoThumbnail(blobUrl);

        const finalResult: EditResult = {
          editedImageBase64: thumbnailBase64,
          mimeType: thumbnailMimeType,
          editedText: `Video generated from prompt: "${videoResult.prompt}"`,
          videoUrl: blobUrl,
        };
        setResult(finalResult);
        setGalleryImages(prev => [{ ...finalResult, id: uuidv4(), type: 'video' }, ...prev]);
        
      } else {
        let res: EditResult;
        if (mode === 'edit' && uploadedImageData) {
          res = await editImage(uploadedImageData.base64, uploadedImageData.mimeType, prompt, selectedCharacter, imageFaithfulness, additionalImageData);
        } else { // mode === 'generate'
          res = await generateImage(prompt, aspectRatio, selectedCharacter, imageFaithfulness);
        }
        setResult(res);
        setGalleryImages(prev => [{ ...res, id: uuidv4(), type: 'image' }, ...prev]);
      }
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes('Requested entity was not found.')) {
            setError('Your API key seems to be invalid for Veo. Please select a different key.');
            setIsKeyReadyForVeo(false);
        } else {
            setError(e.message);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
  };
  
  const handleUpscale = async () => {
    const targetImage = result?.editedImageBase64;
    if (!targetImage) {
        setError("No result image available to upscale.");
        return;
    }
    const targetMime = result?.mimeType || 'image/png';
    
    setIsUpscaling(true);
    setIsLoading(true); // use the same loading indicator
    setError(null);
    setActiveFilters(initialFilterState);
    
    try {
        const res = await upscaleImage(targetImage, targetMime);
        setResult(res);
        // Add upscaled image to gallery, replacing the old one if it exists
        const oldId = galleryImages.find(img => img.editedImageBase64 === targetImage)?.id;
        if (oldId) {
            setGalleryImages(prev => prev.map(img => img.id === oldId ? { ...res, id: oldId, type: 'image' } : img));
        } else {
            setGalleryImages(prev => [{ ...res, id: uuidv4(), type: 'image' }, ...prev]);
        }
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unexpected error occurred during upscaling.');
    } finally {
        setIsLoading(false);
        setIsUpscaling(false);
    }
  };

  const handleNoirFX = async () => {
    const targetImage = result?.editedImageBase64;
    if (!targetImage) {
        setError("No result image available to apply effects to.");
        return;
    }
    const targetMime = result?.mimeType || 'image/png';

    setIsApplyingFX(true);
    setIsLoading(true);
    setError(null);
    setActiveFilters(initialFilterState);
    
    const noirPrompt = `As a master of graphic noir visuals, transform this image into the iconic, high-contrast, black-and-white style of the film "Sin City". Your goal is to create a visually arresting image that is almost entirely monochrome but features a single, selective splash of vibrant color.

**Visual Transformation Steps:**
1.  **Monochrome Conversion:** Convert the entire image to a stark, high-contrast black and white. Crush the blacks to be deep and inky, and push the whites to be bright, almost blown-out, to create a dramatic, graphic novel feel.
2.  **Selective Color Isolation:** Identify the most emotionally significant or visually prominent color in the original image (e.g., a red dress, yellow blood, blue eyes). Isolate this single color and make it intensely saturated and vibrant. All other colors MUST be rendered in black and white. If no single color stands out, use your artistic judgment to select one that will create the most dramatic effect (red is often a good choice).
3.  **Lighting & Texture:**
    -   Amplify the existing lighting to be hard and dramatic, creating sharp, well-defined shadows, true to the film noir aesthetic.
    -   Add a gritty, cinematic film grain to enhance the texture and mood.
    -   If appropriate for the scene, introduce atmospheric elements like stylized rain or swirling smoke.

The final result must be an unmistakable homage to the "Sin City" visual style: a gritty, monochrome world punctuated by a single, powerful burst of color.`;

    try {
        const res = await editImage(targetImage, targetMime, noirPrompt, null, 50, null);
        setResult(res);
        setGalleryImages(prev => [{ ...res, id: uuidv4(), type: 'image' }, ...prev]);
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unexpected error occurred while applying effects.');
    } finally {
        setIsLoading(false);
        setIsApplyingFX(false);
    }
  };

  const handleApplyFilters = async () => {
    if (!result) {
      setError("No result image to apply filters to.");
      return;
    }

    setIsApplyingFilters(true);
    setIsLoading(true);
    setError(null);

    try {
      const applyFiltersToCanvas = (
        imageBase64: string,
        mimeType: string,
        filters: FilterState
      ): Promise<{ base64: string; mimeType: string }> => {
        return new Promise((resolve, reject) => {
          const cssFilterString = getCssFilterString(filters);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return reject(new Error('Could not get canvas context'));
            }
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.filter = cssFilterString;
            ctx.drawImage(img, 0, 0);

            const dataUrl = canvas.toDataURL(mimeType);
            const newBase64 = dataUrl.split(',')[1];
            resolve({ base64: newBase64, mimeType });
          };
          img.onerror = () => reject(new Error('Failed to load image for filter application.'));
          img.src = `data:${mimeType};base64,${imageBase64}`;
        });
      };
      
      const { base64: newBase64, mimeType: newMimeType } = await applyFiltersToCanvas(
          result.editedImageBase64, 
          result.mimeType || 'image/png', 
          activeFilters
      );
      
      const newResult: EditResult = {
        ...result,
        editedImageBase64: newBase64,
        mimeType: newMimeType,
      };

      setResult(newResult);
      setActiveFilters(initialFilterState); // Reset filters after applying
      setGalleryImages(prev => [{ ...newResult, id: uuidv4(), type: 'image' }, ...prev]);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred while applying filters.');
    } finally {
      setIsLoading(false);
      setIsApplyingFilters(false);
    }
  };

  const handleGallerySelect = useCallback((item: GalleryItem) => {
    setActiveFilters(initialFilterState);
    if (item.type === 'video' && item.videoUrl) {
      setResult({
        editedImageBase64: item.editedImageBase64,
        editedText: item.editedText,
        mimeType: item.mimeType,
        videoUrl: item.videoUrl,
      });
      setMode('video');
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      setUploadedImageData(null);
    } else {
      const dataUrl = `data:${item.mimeType || 'image/png'};base64,${item.editedImageBase64}`;
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `gallery-image-${item.id}.png`, { type: item.mimeType || 'image/png' });
          handleImageUpload(file);
          const imageResult: EditResult = { ...item };
          delete imageResult.videoUrl;
          setResult(imageResult);
          setMode('edit');
        });
    }
    window.scrollTo(0, 0);
  }, [handleImageUpload, imagePreview]);
  
  const handleSaveCharacter = (character: Character) => {
    setCharacters(prev => {
        const existingIndex = prev.findIndex(c => c.id === character.id);
        if (existingIndex > -1) {
            const newChars = [...prev];
            newChars[existingIndex] = character;
            return newChars;
        }
        return [...prev, character];
    });
    setIsCharCreatorOpen(false);
    setCharacterToEdit(null);
  };
  
  const handleDeleteCharacter = (id: string) => {
    if (window.confirm("Are you sure you want to delete this character?")) {
        setCharacters(prev => prev.filter(c => c.id !== id));
        if (selectedCharacterId === id) {
            setSelectedCharacterId(null);
        }
    }
  };

  const handleOpenCharCreator = (character: Character | null) => {
    setCharacterToEdit(character);
    setIsCharCreatorOpen(true);
  };
  
  const handleOpenOutfitGenerator = (character: Character) => {
      setCharacterForOutfitGenerator(character);
      setIsOutfitGeneratorOpen(true);
  };
  
  const handleOutfitImageSelect = (imageBase64: string, mimeType?: string) => {
      const dataUrl = `data:${mimeType || 'image/png'};base64,${imageBase64}`;
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `outfit-image-${uuidv4()}.png`, { type: mimeType || 'image/png' });
          handleImageUpload(file);
          setResult({editedImageBase64: imageBase64, editedText: null, mimeType});
          setMode('edit');
          setIsOutfitGeneratorOpen(false);
          window.scrollTo(0, 0);
        });
  };

  const handleOutfitGenerated = (outfitResult: EditResult) => {
    setGalleryImages(prev => [{ ...outfitResult, id: uuidv4(), type: 'image' }, ...prev]);
  };

  const isSubmitDisabled = isLoading || !prompt || (mode === 'edit' && !uploadedImageData) || (mode === 'video' && !isKeyReadyForVeo);
  const promptPlaceholder = 
    mode === 'edit' ? "Describe the changes you want to make..." : 
    mode === 'generate' ? "Describe the image you want to create..." :
    "Describe the video you want to create...";

  const getSubmitButtonText = () => {
    switch (mode) {
      case 'edit': return 'Apply Edits';
      case 'generate': return 'Generate Image';
      case 'video': return 'Generate Video';
    }
  };

  return (
    <>
      <div className="min-h-screen font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Header />
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Controls */}
            <div className="space-y-6 flex flex-col">
              <div className="flex bg-gray-900/50 backdrop-blur-sm p-1 rounded-full border border-white/10 w-fit mx-auto">
                  <button
                      onClick={() => handleModeChange('generate')}
                      className={`relative px-6 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'generate' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                      {mode === 'generate' && <span className="absolute inset-0 bg-orange-600 rounded-full -z-10 motion-safe:animate-pulse"></span>}
                      <span className="relative z-10">Generate</span>
                  </button>
                  <button
                      onClick={() => handleModeChange('edit')}
                      className={`relative px-6 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'edit' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                      {mode === 'edit' && <span className="absolute inset-0 bg-orange-600 rounded-full -z-10 motion-safe:animate-pulse"></span>}
                      <span className="relative z-10">Edit</span>
                  </button>
                   <button
                      onClick={() => handleModeChange('video')}
                      className={`relative px-6 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'video' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                      {mode === 'video' && <span className="absolute inset-0 bg-orange-600 rounded-full -z-10 motion-safe:animate-pulse"></span>}
                      <span className="relative z-10">Video</span>
                  </button>
              </div>

              {(mode === 'edit' || mode === 'video') && (
                <ImageUploader onImageUpload={handleImageUpload} preview={imagePreview} />
              )}
              
              {mode === 'video' && !isKeyReadyForVeo && (
                <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-xl text-center space-y-3 text-white">
                  <h3 className="font-semibold text-red-300">Veo API Key Required</h3>
                  <p className="text-sm text-red-400/90">Video generation with Veo requires an API key with billing enabled.</p>
                  <button onClick={handleSelectKey} className="bg-orange-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-700 transition-colors">Select API Key</button>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:underline block pt-1">Learn about billing</a>
                </div>
              )}

              {mode !== 'video' && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-xl space-y-4">
                  <CharacterGallery
                      characters={characters}
                      selectedCharacterId={selectedCharacterId}
                      onSelectCharacter={setSelectedCharacterId}
                      onEditCharacter={(char) => handleOpenCharCreator(char)}
                      onCreateCharacter={() => handleOpenCharCreator(null)}
                      onDeleteCharacter={handleDeleteCharacter}
                      onGenerateOutfits={handleOpenOutfitGenerator}
                      disabled={isLoading}
                  />
                  {selectedCharacterId && (
                      <StrengthSlider
                        label="Character Faithfulness"
                        value={imageFaithfulness}
                        onChange={setImageFaithfulness}
                        minLabel="Creative"
                        maxLabel="Strict"
                      />
                  )}
                  {mode === 'generate' && (
                      <AspectRatioSelector selectedRatio={aspectRatio} onRatioChange={setAspectRatio} disabled={isLoading} />
                  )}
                  {mode === 'edit' && (
                      <AdditionalImageUploader
                        onImageUpload={handleAdditionalImageUpload}
                        onImageRemove={handleRemoveAdditionalImage}
                        preview={additionalImagePreview}
                      />
                  )}
                </div>
              )}
              
              <PromptInput value={prompt} onChange={setPrompt} disabled={isLoading} placeholder={promptPlaceholder} />
              
              <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled}
                    className="flex-grow flex items-center justify-center gap-2 w-full p-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-lg shadow-lg hover:shadow-[0_0_20px_theme(colors.orange.500/40%)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300"
                  >
                    <SparklesIcon className="w-6 h-6" />
                    <span>{getSubmitButtonText()}</span>
                  </button>
                  {result && mode !== 'video' && (
                     <>
                      <button
                          onClick={handleNoirFX}
                          disabled={isLoading}
                          className="flex-grow flex items-center justify-center gap-2 w-full p-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                          title="Apply a high-contrast, selective color 'Sin City' noir effect"
                      >
                          <PaintBrushIcon className="w-6 h-6" />
                          <span>Noir FX</span>
                      </button>
                       <button
                          onClick={handleUpscale}
                          disabled={isLoading}
                          className="flex-grow flex items-center justify-center gap-2 w-full p-4 bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                          title="Upscale result image to a higher resolution"
                      >
                          <ArrowUpOnSquareIcon className="w-6 h-6" />
                          <span>Upscale</span>
                      </button>
                    </>
                  )}
              </div>
              {result && !isLoading && !result.videoUrl && (
                <ImageFilter
                  filters={activeFilters}
                  onFilterChange={setActiveFilters}
                  onApply={handleApplyFilters}
                  disabled={isLoading}
                />
              )}
            </div>

            {/* Right Column: Result */}
            <div className="flex-grow">
               <ResultDisplay
                  isLoading={isLoading}
                  error={error}
                  result={result}
                  originalImagePreview={imagePreview}
                  mode={mode}
                  filterStyle={{ filter: getCssFilterString(activeFilters) }}
                  loadingText={
                    isUpscaling ? 'Upscaling image to high resolution...' :
                    isApplyingFX ? 'Applying noir effects...' :
                    isApplyingFilters ? 'Applying image filters...' :
                    mode === 'video' && isLoading ? videoLoadingMessage :
                    undefined
                  }
                />
            </div>
          </main>
          
          <Gallery images={galleryImages} onImageSelect={handleGallerySelect} />

        </div>
      </div>
      <CharacterCreatorModal 
        isOpen={isCharCreatorOpen} 
        onClose={() => { setIsCharCreatorOpen(false); setCharacterToEdit(null); }}
        onSaveCharacter={handleSaveCharacter}
        existingCharacter={characterToEdit}
      />
      <OutfitGeneratorModal
        isOpen={isOutfitGeneratorOpen}
        onClose={() => setIsOutfitGeneratorOpen(false)}
        character={characterForOutfitGenerator}
        onImageSelect={(img, mime) => handleOutfitImageSelect(img, mime)}
        onOutfitGenerated={handleOutfitGenerated}
      />
    </>
  );
};

export default App;