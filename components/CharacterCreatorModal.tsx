import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateCharacterImage } from '../services/geminiService';
import type { Character } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadIcon } from './icons/UploadIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface CharacterCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
  existingCharacter: Character | null;
}

interface RefImage {
  file: File;
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


export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({ isOpen, onClose, onSaveCharacter, existingCharacter, onDeleteCharacter }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [referenceImages, setReferenceImages] = useState<RefImage[]>([]);
  const [generatedPortraitBase64, setGeneratedPortraitBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEditMode = !!existingCharacter;

  useEffect(() => {
    if (isOpen && existingCharacter) {
      setName(existingCharacter.name);
      setDescription(existingCharacter.description);
      setGeneratedPortraitBase64(existingCharacter.referenceImageBase64 || null);
    }
    setConfirmingDelete(false);
  }, [isOpen, existingCharacter]);

  const resetState = useCallback(() => {
    setName('');
    setDescription('');
    setReferenceImages([]);
    setGeneratedPortraitBase64(null);
    setIsLoading(false);
    setError(null);
    setConfirmingDelete(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5 - referenceImages.length);
      const newImages = files.map(file => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setReferenceImages(prev => [...prev, ...newImages]);
    }
  };

  const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve({
        data: (reader.result as string).split(',')[1],
        mimeType: file.type
      });
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGeneratePortrait = async () => {
    if (!description) {
        setError("Please provide a description.");
        return;
    }
    setIsLoading(true);
    setError(null);
    
    const oldPortrait = generatedPortraitBase64;
    setGeneratedPortraitBase64(null);

    try {
      const imagePayloads = await Promise.all(referenceImages.map(img => fileToBase64(img.file)));
      const result = await generateCharacterImage(description, imagePayloads);
      setGeneratedPortraitBase64(result.editedImageBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate portrait.");
      setGeneratedPortraitBase64(oldPortrait); // Restore the old portrait on failure
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = () => {
    if (!name || !description || !generatedPortraitBase64) {
        setError("Please provide a name, description, and generate/set a portrait before saving.");
        return;
    }
    const characterData: Character = {
        id: existingCharacter?.id || uuidv4(),
        name,
        description,
        referenceImageBase64: generatedPortraitBase64
    };
    onSaveCharacter(characterData);
    handleClose();
  };
  
  const handleDelete = () => {
    if (!existingCharacter) return;
  
    if (confirmingDelete) {
      onDeleteCharacter(existingCharacter.id);
      handleClose();
    } else {
      setConfirmingDelete(true);
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setDescription(prev => prev ? `${prev}, ${suggestion}` : suggestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-gray-950 border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">{isEditMode ? 'Edit Character' : 'Create New Character'}</h2>
          <p className="text-sm text-gray-400 mt-1">{isEditMode ? 'Modify your character\'s details and regenerate their portrait.' : 'Define a character using a description, reference images, or both for visual consistency.'}</p>
        </div>

        <div className="p-6 flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
                <div>
                    <label htmlFor="char-name" className="block mb-2 text-sm font-medium text-gray-300">Character Name</label>
                    <input id="char-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Captain Astra" className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-orange-500 focus:border-orange-500"/>
                </div>
                <div>
                    <label htmlFor="char-desc" className="block mb-2 text-sm font-medium text-gray-300">Description</label>
                    <textarea id="char-desc" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe key visual features, clothing, and style..." className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-orange-500 focus:border-orange-500"/>
                </div>
                 <div className="flex flex-col gap-2">
                    <label className="block text-xs font-medium text-gray-400">Prompt Suggestions (Click to add)</label>
                    <div className="flex flex-wrap gap-2">
                      {promptSuggestions.map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-200 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-300">Reference Images</label>
                        <span className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{`${referenceImages.length} / 5`}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {referenceImages.map((img, i) => (
                            <img key={i} src={img.preview} alt="reference" className="w-full h-24 object-cover rounded-md" />
                        ))}
                        {referenceImages.length < 5 && (
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-700 rounded-md cursor-pointer hover:bg-gray-800/50">
                                <UploadIcon className="w-8 h-8 text-gray-500" />
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        )}
                    </div>
                </div>
                 <button onClick={handleGeneratePortrait} disabled={isLoading || !description} className="w-full mt-2 p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'Generating...' : 'Generate Character Portrait'}
                </button>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-gray-900 rounded-lg border border-gray-800 min-h-[20rem]">
                {isLoading && <LoadingSpinner />}
                {error && <p className="text-red-400 text-center">{error}</p>}
                {generatedPortraitBase64 && !isLoading && (
                    <div className="text-center">
                        <img src={`data:image/png;base64,${generatedPortraitBase64}`} alt="Generated portrait" className="w-full object-contain rounded-md" />
                         <div className="flex items-center justify-center gap-2 mt-4 text-green-400">
                           <CheckCircleIcon className="w-5 h-5"/>
                           <p className="text-sm font-medium">Portrait Generated!</p>
                        </div>
                    </div>
                )}
                {!isLoading && !generatedPortraitBase64 && !error && (
                    <p className="text-gray-500 text-center">Your generated character portrait will appear here.</p>
                )}
            </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-between items-center">
            <div>
                {isEditMode && (
                    <button 
                        onClick={handleDelete}
                        onMouseLeave={() => setConfirmingDelete(false)}
                        className={`px-4 py-2 text-sm rounded-md transition-all duration-300 ${
                            confirmingDelete 
                            ? 'bg-red-600 text-white scale-105' 
                            : 'bg-red-900/70 text-red-300 hover:bg-red-800/70'
                        }`}
                    >
                        {confirmingDelete ? 'Confirm Delete?' : 'Delete'}
                    </button>
                )}
            </div>
            <div className="flex gap-4">
                <button onClick={handleClose} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700">Cancel</button>
                <button onClick={handleSave} disabled={!generatedPortraitBase64 || !name || !description || isLoading} className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed">
                    {isEditMode ? 'Save Changes' : 'Save Character'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};