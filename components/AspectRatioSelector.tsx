import React from 'react';
import { SquareIcon } from './icons/SquareIcon';
import { LandscapeIcon } from './icons/LandscapeIcon';
import { PortraitIcon } from './icons/PortraitIcon';
import { Landscape43Icon } from './icons/Landscape43Icon';
import { Portrait34Icon } from './icons/Portrait34Icon';

interface AspectRatioSelectorProps {
  selectedRatio: string;
  onRatioChange: (ratio: string) => void;
  disabled: boolean;
}

const ratios = [
  { value: '1:1', label: 'Square', Icon: SquareIcon },
  { value: '4:3', label: 'Standard', Icon: Landscape43Icon },
  { value: '3:4', label: 'Portrait', Icon: Portrait34Icon },
  { value: '16:9', label: 'Widescreen', Icon: LandscapeIcon },
  { value: '9:16', label: 'Story', Icon: PortraitIcon },
];

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selectedRatio, onRatioChange, disabled }) => {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-300">Aspect Ratio</label>
      <div className="grid grid-cols-5 gap-2">
        {ratios.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => onRatioChange(value)}
            disabled={disabled}
            className={`flex flex-col items-center justify-center p-2 text-xs font-medium rounded-lg transition-all duration-200 border
              ${selectedRatio === value
                ? 'bg-orange-600/20 border-orange-500 text-white shadow-md'
                : 'bg-black/20 border-white/10 text-gray-300 hover:border-orange-600/50 hover:bg-black/30'
              }
              disabled:bg-gray-800/50 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};