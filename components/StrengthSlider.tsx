import React from 'react';

interface StrengthSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
}

export const StrengthSlider: React.FC<StrengthSliderProps> = ({ label, value, onChange, minLabel, maxLabel }) => {
  return (
    <div className="bg-gray-800/50 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor="strength-slider" className="font-medium text-gray-300">
          {label}
        </label>
        <span className="text-sm font-mono bg-gray-900 text-orange-400 px-2 py-1 rounded">
          {value}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">{minLabel}</span>
        <input
          id="strength-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all
                     [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none"
        />
        <span className="text-xs text-gray-500">{maxLabel}</span>
      </div>
    </div>
  );
};
