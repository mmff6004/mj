import React, { useState, useCallback, useMemo } from 'react';
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
import { editImage, generateImage } from './services/geminiService';
import type { EditResult, GalleryItem, Character } from './types';

type Mode = 'edit' | 'generate';

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
      case 'Horror': return 'horror theme, dark and unsettling atmosphere, creepy, eerie lighting, macabre details, suspenseful, gothic, surreal';
      case 'Animation': return '3D animation style, rendered in Octane, Pixar style, Disney style, smooth shading, vibrant and playful, stylized characters';
      case 'Hentai': return 'hentai anime style, adult anime aesthetic, ecchi, detailed character design, NSFW';
      case 'Realistic': return 'photorealistic, hyperrealistic, 8k resolution, Unreal Engine 5 render, sharp focus, high detail, realistic textures';
      default: return '';
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    setResult(null);

    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
    const faithfulnessPrefix = getFaithfulnessPrefix(imageFaithfulness);
    const styleSuffix = getStyleSuffix(selectedStyle);
    const characterPrefix = selectedCharacter ? `Featuring the character: ${selectedCharacter.description}. ` : '';
    
    const finalPrompt = `${characterPrefix}${faithfulnessPrefix}${prompt}${styleSuffix ? `, ${styleSuffix}` : ''}`;

    try {
      let apiResult: EditResult;
      if (mode === 'edit' && uploadedFile) {
        const reader = new FileReader();
        reader.readAsDataURL(uploadedFile);
        reader.onloadend = async () => {
            const imageBase64 = (reader.result as string).split(',')[1];
            apiResult = await editImage(imageBase64, uploadedFile.type, finalPrompt, selectedCharacter?.referenceImageBase64);
            handleResult(apiResult);
        }
      } else {
        apiResult = await generateImage(finalPrompt, selectedCharacter?.referenceImageBase64);
        handleResult(apiResult);
      }
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
    const existingIndex = characters.findIndex(c => c.id === character.id);
    if (existingIndex > -1) {
      setCharacters(prev => {
        const newChars = [...prev];
        newChars[existingIndex] = character;
        return newChars;
      });
    } else {
      setCharacters(prev => [...prev, character]);
    }
    setIsCharCreatorOpen(false);
  };

  const isSubmitDisabled = isLoading || !prompt || (mode === 'edit' && !imagePreview);
  
  return (
    <div className="min-h-screen text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        <main className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-700">
              <button onClick={() => setMode('edit')} className={`w-1/2 py-2.5 rounded-md text-sm font-semibold transition-colors ${mode === 'edit' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Edit Image</button>
              <button onClick={() => setMode('generate')} className={`w-1/2 py-2.5 rounded-md text-sm font-semibold transition-colors ${mode === 'generate' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Generate Image</button>
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
            
            <CharacterGallery
              characters={characters}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onEditCharacter={handleEditCharacter}
              onCreateCharacter={handleOpenCreator}
              disabled={isLoading}
            />

            <StyleSelector selectedStyle={selectedStyle} onStyleChange={setSelectedStyle} disabled={isLoading} />
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
            existingCharacter={characterToEdit}
            key={characterToEdit?.id || 'new'}
          />
        )}
      </div>
    </div>
  );
};
export default App;
