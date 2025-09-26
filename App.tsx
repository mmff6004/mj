
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
import { PlusCircleIcon } from './components/icons/PlusCircleIcon';
import { ArrowUpOnSquareIcon } from './components/icons/ArrowUpOnSquareIcon';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { OutfitGeneratorModal } from './components/LookbookModal';
import { editImage, generateImage, upscaleImage } from './services/geminiService';
import type { EditResult, GalleryItem, Character } from './types';
import { ArrowDownTrayIcon } from './components/icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from './components/icons/ArrowUpTrayIcon';
import { AdditionalImageUploader } from './components/AdditionalImageUploader';
import { fileToBase64 } from './utils/fileUtils';

type Mode = 'edit' | 'generate';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [uploadedImageData, setUploadedImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalImageData, setAdditionalImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [additionalImagePreview, setAdditionalImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);


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

  const handleImageUpload = useCallback(async (file: File) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setUploadedImageData(null);
    setResult(null);
    setError(null);
    
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

    try {
      let res: EditResult;
      if (mode === 'edit' && uploadedImageData) {
        res = await editImage(uploadedImageData.base64, uploadedImageData.mimeType, prompt, selectedCharacter, imageFaithfulness, additionalImageData);
      } else { // mode === 'generate'
        res = await generateImage(prompt, aspectRatio, selectedCharacter, imageFaithfulness);
      }
      setResult(res);
      setGalleryImages(prev => [{ ...res, id: uuidv4() }, ...prev]);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpscale = async () => {
    const targetImage = result?.editedImageBase64;
    if (!targetImage) {
        setError("No result image available to upscale.");
        return;
    }
    
    setIsUpscaling(true);
    setIsLoading(true); // use the same loading indicator
    setError(null);
    
    try {
        const res = await upscaleImage(targetImage, 'image/png'); // Assuming png
        setResult(res);
        // Add upscaled image to gallery, replacing the old one if it exists
        const oldId = galleryImages.find(img => img.editedImageBase64 === targetImage)?.id;
        if (oldId) {
            setGalleryImages(prev => prev.map(img => img.id === oldId ? { ...res, id: oldId } : img));
        } else {
            setGalleryImages(prev => [{ ...res, id: uuidv4() }, ...prev]);
        }
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unexpected error occurred during upscaling.');
    } finally {
        setIsLoading(false);
        setIsUpscaling(false);
    }
  };

  const handleGallerySelect = useCallback((item: GalleryItem) => {
    const dataUrl = `data:image/png;base64,${item.editedImageBase64}`;
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `gallery-image-${item.id}.png`, { type: 'image/png' });
        handleImageUpload(file);
        setResult(item); // Show the selected image in the result view
        setMode('edit');
        window.scrollTo(0, 0);
      });
  }, [handleImageUpload]);
  
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
  
  const handleOutfitImageSelect = (imageBase64: string) => {
      const dataUrl = `data:image/png;base64,${imageBase64}`;
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `outfit-image-${uuidv4()}.png`, { type: 'image/png' });
          handleImageUpload(file);
          setResult({editedImageBase64: imageBase64, editedText: null}); // Show the selected image
          setMode('edit');
          setIsOutfitGeneratorOpen(false);
          window.scrollTo(0, 0);
        });
  };

  const handleOutfitGenerated = (outfitResult: EditResult) => {
    setGalleryImages(prev => [{ ...outfitResult, id: uuidv4() }, ...prev]);
  };

  const isSubmitDisabled = isLoading || !prompt || (mode === 'edit' && !uploadedImageData);
  const promptPlaceholder = mode === 'edit' ? "Describe the changes you want to make..." : "Describe the image you want to create...";

  return (
    <>
      <div className="min-h-screen bg-black text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Header />
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Controls */}
            <div className="space-y-6 flex flex-col">
              <div className="flex bg-gray-900/80 p-1 rounded-full border border-gray-700 w-fit mx-auto">
                  <button
                      onClick={() => handleModeChange('generate')}
                      className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'generate' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                  >
                      Generate
                  </button>
                  <button
                      onClick={() => handleModeChange('edit')}
                      className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'edit' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                  >
                      Edit
                  </button>
              </div>

              {mode === 'edit' && (
                <ImageUploader onImageUpload={handleImageUpload} preview={imagePreview} />
              )}

              <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-4">
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
              
              <PromptInput value={prompt} onChange={setPrompt} disabled={isLoading} placeholder={promptPlaceholder} />
              
              <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled}
                    className="flex-grow flex items-center justify-center gap-2 w-full p-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-lg shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300"
                  >
                    <SparklesIcon className="w-6 h-6" />
                    <span>Generate</span>
                  </button>
                  {result && (
                     <button
                        onClick={handleUpscale}
                        disabled={isLoading}
                        className="flex-grow flex items-center justify-center gap-2 w-full p-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        title="Upscale result image to a higher resolution"
                    >
                        <ArrowUpOnSquareIcon className="w-6 h-6" />
                        <span>Upscale</span>
                    </button>
                  )}
              </div>
            </div>

            {/* Right Column: Result */}
            <div className="flex-grow">
               <ResultDisplay
                  isLoading={isLoading}
                  error={error}
                  result={result}
                  originalImagePreview={imagePreview}
                  mode={mode}
                  loadingText={isUpscaling ? 'Upscaling image to high resolution...' : undefined}
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
        onImageSelect={handleOutfitImageSelect}
        onOutfitGenerated={handleOutfitGenerated}
      />
    </>
  );
};

export default App;
