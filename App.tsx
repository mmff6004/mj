import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PromptInput } from './components/PromptInput';
import { ResultDisplay } from './components/ResultDisplay';
import { Gallery } from './components/Gallery';
import { CharacterGallery } from './components/CharacterGallery';
import { CharacterCreatorModal } from './components/CharacterCreatorModal';
import { StyleSelector } from './components/StyleSelector';
import { StrengthSlider } from './components/StrengthSlider';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { PlusCircleIcon } from './components/icons/PlusCircleIcon';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { ContentFilter } from './components/ContentFilter';
import { editImage, generateImage } from './services/geminiService';
import type { EditResult, GalleryItem, Character } from './types';

type Mode = 'edit' | 'generate';

const readFileAsBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result || !result.includes(',')) {
        return reject(new Error("Could not read file as data URL."));
      }
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EditResult | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isCharCreatorOpen, setIsCharCreatorOpen] = useState(false);
  const [characterToEdit, setCharacterToEdit] = useState<Character | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [imageFaithfulness, setImageFaithfulness] = useState(50);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [activeFilters, setActiveFilters] = useState<string[]>(['Horror Content', 'Adult Themes']);

  // Load characters from localStorage on initial render
  useEffect(() => {
    try {
      const savedCharacters = localStorage.getItem('mj-ai-characters');
      if (savedCharacters) {
        setCharacters(JSON.parse(savedCharacters));
      }
    } catch (error) {
      console.error("Failed to load characters from localStorage", error);
    }
  }, []);

  // Save characters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('mj-ai-characters', JSON.stringify(characters));
    } catch (error) {
      console.error("Failed to save characters to localStorage", error);
    }
  }, [characters]);


  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Could not determine mime type from data URL.');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleImageUpload = useCallback((file: File, keepResult: boolean = false) => {
    setUploadedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    if (!keepResult) {
      setResult(null);
    }
    setMode('edit');
  }, []);

  const getFaithfulnessPrefix = (value: number): string => {
    if (mode !== 'edit' || !uploadedFile) return '';
    if (value < 33) return 'Drastically reimagine the uploaded image based on this prompt, using it only for loose inspiration: ';
    if (value < 66) return 'Modify the uploaded image according to this prompt, taking some creative liberties: ';
    return 'Closely follow the uploaded image\'s composition and subjects, but apply these changes from the prompt: ';
  };

  const getStyleSuffix = (style: string): string => {
    switch (style) {
      case 'Cinematic': return 'cinematic lighting, dramatic composition, film grain, high detail, epic scale, wide angle shot, moody atmosphere';
      case 'Anime': return 'anime style, vibrant colors, cel shading, Japanese animation aesthetic, clean lines, expressive eyes, dynamic poses';
      case 'Horror': return 'cinematic horror, lovecraftian aesthetic, dark and unsettling atmosphere, eerie lighting from an unseen source, macabre details, suspenseful mood, gothic architecture, surreal imagery, inspired by the art of Zdzisław Beksiński';
      case 'Animation': return '3D animation style, rendered in Octane, Pixar style, Disney style, smooth shading, vibrant and playful, stylized characters';
      case 'Fantasy': return 'fantasy art style, intricate details, magical elements, ethereal lighting, imaginative world, epic fantasy aesthetic';
      case 'Realistic': return 'photorealistic, hyperrealistic, 8k resolution, Unreal Engine 5 render, sharp focus, high detail, realistic textures';
      case 'X': return 'hyperrealistic, photorealistic, intimate portrait style, character wearing delicate and intricate lace and silk lingerie, minimalist design with minimal coverage, dramatic chiaroscuro lighting to accentuate the body\'s lines and shadows, 8k resolution, sharp focus';
      default: return '';
    }
  };
  
  const getNegativePrompt = (filters: string[]): string => {
    if (filters.length === 0) return '';
    const parts: string[] = [];
    if (filters.includes('Horror Content')) {
        parts.push('scary themes, horror, gore, unsettling imagery, disturbing');
    }
    if (filters.includes('Adult Themes')) {
        parts.push('nudity, sexually suggestive content, nsfw, adult themes');
    }
    if (parts.length === 0) return '';
    return `, negative prompt: (${parts.join(', ')})`;
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    setResult(null);

    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
    const faithfulnessPrefix = getFaithfulnessPrefix(imageFaithfulness);
    const styleSuffix = getStyleSuffix(selectedStyle);
    const negativePrompt = getNegativePrompt(activeFilters);
    
    const finalPrompt = `${faithfulnessPrefix}${prompt}${styleSuffix ? `, ${styleSuffix}` : ''}${negativePrompt}`;

    try {
      let apiResult: EditResult;
      if (mode === 'edit' && uploadedFile) {
        const { base64, mimeType } = await readFileAsBase64(uploadedFile);
        apiResult = await editImage(base64, mimeType, finalPrompt, selectedCharacter);
      } else {
        apiResult = await generateImage(finalPrompt, aspectRatio, selectedCharacter);
      }
      handleResult(apiResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  const handleResult = (apiResult: EditResult) => {
    setResult(apiResult);
    const galleryItem: GalleryItem = { ...apiResult, id: uuidv4() };
    setGalleryImages(prev => [galleryItem, ...prev]);

    // Iterative editing workflow
    const nextInputFile = dataURLtoFile(`data:image/png;base64,${apiResult.editedImageBase64}`, `generated-${Date.now()}.png`);
    handleImageUpload(nextInputFile, true);
    setPrompt(''); // Clear prompt for next iteration
    setIsLoading(false);
  };

  const handleGalleryImageSelect = (item: GalleryItem) => {
    const file = dataURLtoFile(`data:image/png;base64,${item.editedImageBase64}`, "edited-image.png");
    handleImageUpload(file);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCreator = () => {
    setCharacterToEdit(null);
    setIsCharCreatorOpen(true);
  };

  const handleEditCharacter = (character: Character) => {
    setCharacterToEdit(character);
    setIsCharCreatorOpen(true);
  };

  const handleSaveCharacter = (character: Character) => {
    setCharacters(prev => {
      const existingIndex = prev.findIndex(c => c.id === character.id);
      if (existingIndex > -1) {
        const newChars = [...prev];
        newChars[existingIndex] = character;
        return newChars;
      } else {
        return [...prev, character];
      }
    });
    setIsCharCreatorOpen(false);
  };

  const handleDeleteCharacter = (characterId: string) => {
    setCharacters(prev => prev.filter(c => c.id !== characterId));
    if (selectedCharacterId === characterId) {
      setSelectedCharacterId(null);
    }
    // Also close the modal if it was open for the deleted character
    setIsCharCreatorOpen(false);
  };

  const handleStartNew = useCallback(() => {
    setMode('generate');
    setPrompt('');
    setUploadedFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setSelectedStyle('');
    setAspectRatio('1:1');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isSubmitDisabled = isLoading || !prompt || (mode === 'edit' && !imagePreview);
  
  return (
    <div className="min-h-screen text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        <main className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
             <div className="flex items-center gap-2">
                <div className="flex-grow flex bg-gray-950 p-1 rounded-lg border border-gray-700">
                    <button onClick={() => setMode('edit')} className={`w-1/2 py-2.5 rounded-md text-sm font-semibold transition-colors ${mode === 'edit' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Edit Image</button>
                    <button onClick={() => setMode('generate')} className={`w-1/2 py-2.5 rounded-md text-sm font-semibold transition-colors ${mode === 'generate' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Generate Image</button>
                </div>
                <button 
                    onClick={handleStartNew}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
                    title="Start a new image generation"
                >
                    <PlusCircleIcon className="w-5 h-5" />
                    <span className="text-sm font-semibold">New</span>
                </button>
            </div>
            
            {mode === 'edit' && <ImageUploader onImageUpload={handleImageUpload} preview={imagePreview} />}
            {mode === 'edit' && imagePreview && (
              <StrengthSlider
                label="Image Faithfulness"
                value={imageFaithfulness}
                onChange={setImageFaithfulness}
                minLabel="Creative"
                maxLabel="Strict"
              />
            )}
            
            {mode === 'generate' && (
              <AspectRatioSelector 
                selectedRatio={aspectRatio}
                onRatioChange={setAspectRatio}
                disabled={isLoading}
              />
            )}

            <CharacterGallery
              characters={characters}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onEditCharacter={handleEditCharacter}
              onCreateCharacter={handleOpenCreator}
              onDeleteCharacter={handleDeleteCharacter}
              disabled={isLoading}
            />

            <StyleSelector selectedStyle={selectedStyle} onStyleChange={setSelectedStyle} disabled={isLoading} />
            <ContentFilter activeFilters={activeFilters} onFilterChange={setActiveFilters} disabled={isLoading} />
            <PromptInput value={prompt} onChange={setPrompt} disabled={isLoading} placeholder={mode === 'generate' ? "e.g., A cute cat wearing a wizard hat..." : "e.g., Make the background a starry night..."}/>
            <button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
              <SparklesIcon className="w-6 h-6" />
              <span>{isLoading ? 'Generating...' : 'Generate'}</span>
            </button>
          </div>
          <div className="row-start-1 lg:row-start-auto">
            <ResultDisplay isLoading={isLoading} error={error} result={result} originalImagePreview={imagePreview} mode={mode}/>
          </div>
        </main>
        
        {galleryImages.length > 0 && <Gallery images={galleryImages} onImageSelect={handleGalleryImageSelect} />}

        {isCharCreatorOpen && (
          <CharacterCreatorModal 
            isOpen={isCharCreatorOpen}
            onClose={() => setIsCharCreatorOpen(false)}
            onSaveCharacter={handleSaveCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            existingCharacter={characterToEdit}
            key={characterToEdit?.id || 'new'}
          />
        )}
      </div>
    </div>
  );
};
export default App;