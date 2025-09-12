import React from 'react';
import { SquareIcon } from './icons/SquareIcon';
import { LandscapeIcon } from './icons/LandscapeIcon';
import { PortraitIcon } from './icons/PortraitIcon';

interface AspectRatioSelectorProps {
  selectedRatio: string;
  onRatioChange: (ratio: string) => void;
  disabled: boolean;
}

const ratios = [
  { value: '1:1', label: 'Instagram', Icon: SquareIcon },
  { value: '16:9', label: 'Desktop', Icon: LandscapeIcon },
  { value: '9:16', label: 'Mobile', Icon: PortraitIcon },
];

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selectedRatio, onRatioChange, disabled }) => {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-300">Aspect Ratio</label>
      <div className="grid grid-cols-3 gap-2">
        {ratios.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => onRatioChange(value)}
            disabled={disabled}
            className={`flex flex-col items-center justify-center p-3 text-sm font-medium rounded-lg transition-all duration-200 border-2
              ${selectedRatio === value
                ? 'bg-orange-600/20 border-orange-500 text-white shadow-md'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-orange-600 hover:bg-gray-700/50'
              }
              disabled:bg-gray-800 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
