
import React from 'react';
import type { Character } from '../types';
import { EditIcon } from './icons/EditIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ShirtIcon } from './icons/BookOpenIcon';


interface CharacterGalleryProps {
  characters: Character[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  onEditCharacter: (character: Character) => void;
  onCreateCharacter: () => void;
  onDeleteCharacter: (id: string) => void;
  onGenerateOutfits: (character: Character) => void;
  disabled: boolean;
}

export const CharacterGallery: React.FC<CharacterGalleryProps> = ({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onEditCharacter,
  onCreateCharacter,
  onDeleteCharacter,
  onGenerateOutfits,
  disabled
}) => {
  return (
    <div>
        <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-300">
                Character Library
            </label>
            <button
                onClick={onCreateCharacter}
                disabled={disabled}
                className="flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
                <UserPlusIcon className="w-4 h-4" />
                <span>Create New</span>
            </button>
        </div>
      <div className="p-2 bg-black/20 border border-white/10 rounded-lg">
        {characters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Your character library is empty.</p>
            <p className="text-sm">Click "Create New" to add a character.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {characters.map((char) => (
              <div
                key={char.id}
                onClick={() => !disabled && onSelectCharacter(char.id === selectedCharacterId ? null : char.id)}
                className={`relative group aspect-square overflow-hidden rounded-md cursor-pointer transition-all duration-200
                           ${selectedCharacterId === char.id ? 'ring-2 ring-orange-500 shadow-[0_0_15px_theme(colors.orange.500/50%)]' : 'ring-1 ring-white/10 hover:ring-orange-600/70'}
                           ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {char.referenceImageBase64 ? (
                  <img
                    src={`data:image/png;base64,${char.referenceImageBase64}`}
                    alt={char.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">
                    {char.name.substring(0, 1)}
                  </div>
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                 <p className="absolute bottom-1 left-2 right-2 text-white text-xs font-semibold truncate">
                   {char.name}
                 </p>
                 <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!disabled) onGenerateOutfits(char);
                        }}
                        className="p-1.5 bg-black/60 rounded-full text-white hover:bg-orange-600 transition-colors"
                        aria-label={`Generate Outfits for ${char.name}`}
                        title={`Generate Outfits for ${char.name}`}
                    >
                        <ShirtIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent selection when clicking edit
                            if (!disabled) onEditCharacter(char);
                        }}
                        className="p-1.5 bg-black/60 rounded-full text-white hover:bg-orange-600 transition-colors"
                        aria-label={`Edit ${char.name}`}
                        title={`Edit ${char.name}`}
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!disabled) onDeleteCharacter(char.id);
                        }}
                        className="p-1.5 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors"
                        aria-label={`Delete ${char.name}`}
                        title={`Delete ${char.name}`}
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};