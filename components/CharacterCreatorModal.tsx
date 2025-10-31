import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateCharacterImage } from '../services/geminiService';
import type { Character, EditResult } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadIcon } from './icons/UploadIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { fileToBase64 } from '../utils/fileUtils';

interface CharacterCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCharacter: (character: Character) => void;
  existingCharacter: Character | null;
}

interface RefImageData {
    id: string;
    data: string; // base64
    mimeType: string;
    preview: string;
}

const promptSuggestions = [
  'Confident gaze',
  'Athletic build',
  'Elegant posture',
  'Alluring smile',
  'Radiant',
  'Flowing hair',
  'Form-fitting attire',
  'Dynamic pose',
  'Mysterious aura',
  'Graceful',
  'Strong jawline',
  'Chiseled features'
];

export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({ isOpen, onClose, onSaveCharacter, existingCharacter }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [referenceImages, setReferenceImages] = useState<RefImageData[]>([]);
  const [generatedPortrait, setGeneratedPortrait] = useState<EditResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!existingCharacter;

  useEffect(() => {
    if (isOpen && existingCharacter) {
      setName(existingCharacter.name);
      setDescription(existingCharacter.description);
      if (existingCharacter.referenceImageBase64) {
        setGeneratedPortrait({
          editedImageBase64: existingCharacter.referenceImageBase64,
          editedText: null,
          mimeType: existingCharacter.referenceImageMimeType || 'image/png'
        });
      }
    }
  }, [isOpen, existingCharacter]);

  const resetState = useCallback(() => {
    setName('');
    setDescription('');
    referenceImages.forEach(img => URL.revokeObjectURL(img.preview));
    setReferenceImages([]);
    setGeneratedPortrait(null);
    setIsLoading(false);
    setError(null);
  }, [referenceImages]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files).slice(0, 5 - referenceImages.length);
    if (files.length === 0) return;

    // Fix: Explicitly type `file` as `File` to resolve incorrect type inference.
    const newImagesPromises = files.map(async (file: File) => {
        const preview = URL.createObjectURL(file);
        try {
            const { base64, mimeType } = await fileToBase64(file);
            return {
                id: uuidv4(),
                data: base64,
                mimeType: mimeType,
                preview: preview,
            };
        } catch (err) {
            URL.revokeObjectURL(preview);
            throw err;
        }
    });

    try {
        const newImagesData = await Promise.all(newImagesPromises);
        setReferenceImages(prev => [...prev, ...newImagesData]);
    } catch (err) {
        if (err instanceof Error) {
            setError(`Could not read one of the files. Please try again. (Details: ${err.message})`);
        } else {
            setError("An unknown error occurred while reading files.");
        }
    }
  };


  const handleGeneratePortrait = async () => {
    if (!description) {
        setError("Please provide a description.");
        return;
    }
    setIsLoading(true);
    setError(null);
    
    const oldPortrait = generatedPortrait;
    setGeneratedPortrait(null);

    try {
      const imagePayloads = referenceImages.map(img => ({ data: img.data, mimeType: img.mimeType }));
      const result = await generateCharacterImage(description, imagePayloads);
      setGeneratedPortrait(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to generate portrait.");
      }
      setGeneratedPortrait(oldPortrait); // Restore the old portrait on failure
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = () => {
    if (!name || !description || !generatedPortrait?.editedImageBase64) {
        setError("Please provide a name, description, and generate/set a portrait before saving.");
        return;
    }
    const characterData: Character = {
        id: existingCharacter?.id || uuidv4(),
        name,
        description,
        referenceImageBase64: generatedPortrait.editedImageBase64,
        referenceImageMimeType: generatedPortrait.mimeType || 'image/png'
    };
    onSaveCharacter(characterData);
    handleClose();
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setDescription(prev => prev ? `${prev}, ${suggestion}` : suggestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={handleClose}>
      <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{isEditMode ? 'Edit Character' : 'Create New Character'}</h2>
          <p className="text-sm text-gray-400 mt-1">{isEditMode ? 'Modify your character\'s details and regenerate their portrait.' : 'Define a character using a description, reference images, or both for visual consistency.'}</p>
        </div>

        <div className="p-6 flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
                <div>
                    <label htmlFor="char-name" className="block mb-2 text-sm font-medium text-gray-300">Character Name</label>
                    <input id="char-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Captain Astra" className="w-full p-2 bg-white/5 border border-white/10 rounded-md focus:ring-orange-500 focus:border-orange-500"/>
                </div>
                <div>
                    <label htmlFor="char-desc" className="block mb-2 text-sm font-medium text-gray-300">Description</label>
                    <textarea id="char-desc" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe key visual features, clothing, and style..." className="w-full p-2 bg-white/5 border border-white/10 rounded-md focus:ring-orange-500 focus:border-orange-500"/>
                </div>
                 <div className="flex flex-col gap-2">
                    <label className="block text-xs font-medium text-gray-400">Prompt Suggestions (Click to add)</label>
                    <div className="flex flex-wrap gap-2">
                      {promptSuggestions.map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-200 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-300">Reference Images</label>
                        <span className="text-xs font-mono bg-gray-900/50 text-gray-400 px-2 py-0.5 rounded-full">{`${referenceImages.length} / 5`}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {referenceImages.map((img) => (
                            <img key={img.id} src={img.preview} alt="reference" className="w-full h-24 object-cover rounded-md" />
                        ))}
                        {referenceImages.length < 5 && (
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-700 rounded-md cursor-pointer hover:bg-white/5 hover:border-orange-500/50 transition-colors">
                                <UploadIcon className="w-8 h-8 text-gray-500" />
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        )}
                    </div>
                </div>
                 <button onClick={handleGeneratePortrait} disabled={isLoading || !description} className="w-full mt-2 p-3 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'Generating...' : 'Generate Character Portrait'}
                </button>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-black/20 rounded-lg border border-white/10 min-h-[20rem]">
                {isLoading && <LoadingSpinner />}
                {error && <p className="text-red-400 text-center">{error}</p>}
                {generatedPortrait?.editedImageBase64 && !isLoading && (
                    <div className="text-center">
                        <img src={`data:${generatedPortrait.mimeType || 'image/png'};base64,${generatedPortrait.editedImageBase64}`} alt="Generated portrait" className="w-full object-contain rounded-md" />
                         <div className="flex items-center justify-center gap-2 mt-4 text-green-400">
                           <CheckCircleIcon className="w-5 h-5"/>
                           <p className="text-sm font-medium">Portrait Generated!</p>
                        </div>
                    </div>
                )}
                {!isLoading && !generatedPortrait && !error && (
                    <p className="text-gray-500 text-center">Your generated character portrait will appear here.</p>
                )}
            </div>
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end items-center">
            <div className="flex gap-4">
                <button onClick={handleClose} className="px-4 py-2 bg-white/5 text-gray-300 rounded-md hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!generatedPortrait?.editedImageBase64 || !name || !description || isLoading} className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 disabled:bg-orange-600/50 disabled:cursor-not-allowed transition-colors">
                    {isEditMode ? 'Save Changes' : 'Save Character'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};