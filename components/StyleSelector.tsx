import React from 'react';

const styles = [
  'Realistic', 'Cinematic', 'Anime', 'Animation', 'Horror', 'Fantasy', 'X'
];

interface StyleSelectorProps {
  selectedStyle: string;
  onStyleChange: (style: string) => void;
  disabled: boolean;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onStyleChange, disabled }) => {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-300">Artistic Style</label>
      <div className="flex flex-wrap gap-2">
         <button
            key="none"
            onClick={() => onStyleChange('')}
            disabled={disabled}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200
              ${selectedStyle === ''
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
              disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed`}
          >
            None
          </button>
        {styles.map((style) => (
          <button
            key={style}
            onClick={() => onStyleChange(style)}
            disabled={disabled}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200
              ${selectedStyle === style
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
              disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed`}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
};