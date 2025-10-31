
import React from 'react';

export interface FilterState {
  grayscale: number; // 0-100
  sepia: number;     // 0-100
  invert: number;    // 0-100
  brightness: number; // 0-200
  contrast: number;   // 0-200
}

export const initialFilterState: FilterState = {
  grayscale: 0,
  sepia: 0,
  invert: 0,
  brightness: 100,
  contrast: 100,
};

interface ImageFilterProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onApply: () => void;
  disabled: boolean;
}

const FilterSlider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, value, onChange, min = 0, max = 200, step = 1 }) => (
  <div>
    <label className="text-xs text-gray-400">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-1.5 bg-gray-700/50 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full
                   [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none"
      />
      <span className="text-xs font-mono bg-gray-900/50 text-orange-400 px-1.5 py-0.5 rounded">{value}</span>
    </div>
  </div>
);

export const ImageFilter: React.FC<ImageFilterProps> = ({ filters, onFilterChange, onApply, disabled }) => {

  const setPreset = (preset: Partial<FilterState>) => {
    onFilterChange({ ...initialFilterState, ...preset });
  };
  
  const resetFilters = () => {
      onFilterChange(initialFilterState);
  }

  const handleSliderChange = (filterName: keyof FilterState, value: number) => {
    onFilterChange({ ...filters, [filterName]: value });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-xl space-y-4">
      <h3 className="text-lg font-semibold text-center text-gray-200">Image Filters</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button onClick={() => setPreset({ grayscale: 100 })} className="px-3 py-1.5 text-sm font-medium rounded-md bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">Grayscale</button>
        <button onClick={() => setPreset({ sepia: 100 })} className="px-3 py-1.5 text-sm font-medium rounded-md bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">Sepia</button>
        <button onClick={() => setPreset({ invert: 100 })} className="px-3 py-1.5 text-sm font-medium rounded-md bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">Invert</button>
        <button onClick={resetFilters} className="px-3 py-1.5 text-sm font-medium rounded-md bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">Reset</button>
      </div>

      <div className="space-y-3 pt-2">
        <FilterSlider label="Brightness" value={filters.brightness} onChange={(v) => handleSliderChange('brightness', v)} />
        <FilterSlider label="Contrast" value={filters.contrast} onChange={(v) => handleSliderChange('contrast', v)} />
      </div>

      <button
        onClick={onApply}
        disabled={disabled}
        className="w-full mt-2 p-2 bg-green-700/80 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Apply Filters Permanently
      </button>
    </div>
  );
};