import React from 'react';
import type { Character } from '../types';

interface CharacterSelectorProps {
  characters: Character[];
  selectedCharacterId: string | null;
  onCharacterChange: (id: string | null) => void;
  disabled: boolean;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ characters, selectedCharacterId, onCharacterChange, disabled }) => {
  return (
    <div>
        <label htmlFor="character-select" className="block mb-2 text-sm font-medium text-gray-300">
            Character
        </label>
        <select
            id="character-select"
            value={selectedCharacterId ?? ''}
            onChange={(e) => onCharacterChange(e.target.value || null)}
            disabled={disabled || characters.length === 0}
            className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300 disabled:bg-gray-800 disabled:cursor-not-allowed"
        >
            <option value="">-- No Character --</option>
            {characters.map(char => (
                <option key={char.id} value={char.id}>
                    {char.name}
                </option>
            ))}
        </select>
        {characters.length === 0 && (
             <p className="text-xs text-gray-500 mt-1">Create a character to use this feature.</p>
        )}
    </div>
  );
};
