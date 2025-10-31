
import React, { useState } from 'react';
import { generateOutfitForCharacter } from '../services/geminiService';
import type { Character, EditResult } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { SparklesIcon } from './icons/SparklesIcon';
import { StrengthSlider } from './StrengthSlider';

interface OutfitGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  onImageSelect: (imageBase64: string, mimeType?: string) => void;
  onOutfitGenerated: (result: EditResult) => void;
}

const outfitSuggestions = [
  { label: 'Evening Gown', prompt: 'A breathtaking, floor-length evening gown made of flowing silk, adorned with subtle embroidery, radiating elegance for a gala event.' },
  { label: 'Formal Suit', prompt: 'A sharp, impeccably tailored modern business pantsuit in a deep navy blue, exuding confidence and professionalism.' },
  { label: 'Casual Wear', prompt: 'Effortlessly stylish casual weekend outfit: well-fitted dark-wash jeans, a soft white t-shirt, and a fashionable leather jacket.' },
  { label: 'Swimsuit', prompt: 'A trendy and flattering one-piece swimsuit with a stylish side cutout, perfect for a sunny day at a tropical beach.' },
  { label: 'Night Out Dress', prompt: 'A chic and confident little black cocktail dress with an elegant neckline, perfect for a night out in the city.' },
  { label: 'Lingerie', prompt: 'An elegant and delicate matching lingerie set made of intricate floral lace, tasteful and beautiful.' },
  { label: 'Luxury Couture', prompt: 'A glamorous, avant-garde high-fashion couture outfit, as seen on a runway, featuring intricate beading and a dramatic silhouette.' },
  { label: 'Sportswear', prompt: 'High-performance athletic sportswear: sleek, moisture-wicking leggings and a matching supportive sports top, ready for a gym session.' },
  { label: 'Pajamas', prompt: 'A luxurious and comfortable silk pajama set with classic piping details, perfect for a restful and stylish night\'s sleep.' },
  { label: 'Fantasy Armor', prompt: 'An epic fantasy adventurer\'s outfit featuring intricately tooled leather armor over a tunic, complete with a weathered, flowing cloak.' }
];


export const OutfitGeneratorModal: React.FC<OutfitGeneratorModalProps> = ({ isOpen, onClose, character, onImageSelect, onOutfitGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [generatedOutfit, setGeneratedOutfit] = useState<EditResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faithfulness, setFaithfulness] = useState(75);

  const handleGenerate = async () => {
    if (!character || !prompt) {
      setError("Please select a character and enter a prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedOutfit(null);

    try {
      const result = await generateOutfitForCharacter(character, prompt, faithfulness);
      setGeneratedOutfit(result);
      onOutfitGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = () => {
    if (generatedOutfit) {
      onImageSelect(generatedOutfit.editedImageBase64, generatedOutfit.mimeType);
      handleClose();
    }
  };
  
  const handleClose = () => {
      setPrompt('');
      setGeneratedOutfit(null);
      setError(null);
      setIsLoading(false);
      onClose();
  };


  if (!isOpen || !character) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Generate Outfits for {character?.name}</h2>
          <p className="text-sm text-gray-400 mt-1">Describe a new outfit for your character and see them wear it.</p>
        </div>

        <div className="p-6 flex-grow overflow-y-auto grid md:grid-cols-2 gap-6">
          {/* Left Side: Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
                {character.referenceImageBase64 && (
                    <img src={`data:image/png;base64,${character.referenceImageBase64}`} alt={character.name} className="w-48 h-auto object-contain rounded-lg border-2 border-white/10" />
                )}
            </div>
            <div>
              <label htmlFor="outfit-prompt" className="block mb-2 text-sm font-medium text-gray-300">Outfit Description</label>
              <textarea
                id="outfit-prompt"
                rows={5}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g., a futuristic cyberpunk jacket with neon lights, a black leather skirt, and combat boots."
                className="w-full p-2 bg-white/5 border border-white/10 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
             <div className="flex flex-col gap-2">
                <label className="block text-xs font-medium text-gray-400">Outfit Ideas (Click to use)</label>
                <div className="flex flex-wrap gap-2">
                  {outfitSuggestions.map(({ label, prompt: suggestionPrompt }) => (
                    <button
                      key={label}
                      onClick={() => setPrompt(suggestionPrompt)}
                      className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-200 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                      title={suggestionPrompt}
                    >
                      {label}
                    </button>
                  ))}
                </div>
            </div>
            <StrengthSlider
                label="Character Faithfulness"
                value={faithfulness}
                onChange={setFaithfulness}
                minLabel="Creative"
                maxLabel="Strict"
            />
            <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt}
                className="flex-grow flex items-center justify-center gap-2 w-full p-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-lg shadow-lg hover:shadow-[0_0_20px_theme(colors.orange.500/40%)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 mt-auto"
            >
                <SparklesIcon className="w-6 h-6" />
                <span>Generate Outfit</span>
            </button>
          </div>
          
          {/* Right Side: Result */}
          <div className="aspect-[9/16] bg-black/20 rounded-lg flex items-center justify-center relative group overflow-hidden border border-white/10">
            {isLoading && <LoadingSpinner />}
            {error && <p className="text-sm text-red-400 text-center p-4">{error}</p>}
            {generatedOutfit && !isLoading && (
              <>
                <img src={`data:${generatedOutfit.mimeType || 'image/png'};base64,${generatedOutfit.editedImageBase64}`} alt="Generated outfit" className="w-full h-full object-cover" />
                <div
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={handleSelect}
                >
                    <span className="text-white font-bold text-center p-2">Use this Image</span>
                </div>
              </>
            )}
            {!isLoading && !generatedOutfit && !error && (
                <div className="text-center text-gray-500 px-4">
                    <p>Your generated outfit will appear here.</p>
                </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end items-center">
            <button onClick={handleClose} className="px-4 py-2 bg-white/5 text-gray-300 rounded-md hover:bg-white/10 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};