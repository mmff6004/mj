import React from 'react';

interface ContentFilterProps {
  activeFilters: string[];
  onFilterChange: (filters: string[]) => void;
  disabled: boolean;
}

const filters = [
  { id: 'Horror Content', label: 'Horror Content' },
  { id: 'Adult Themes', label: 'Adult Themes' },
];

const ToggleSwitch: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}> = ({ label, checked, onChange, disabled }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <div className={`w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-orange-500/50
                     peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']
                     after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300
                     after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                     peer-checked:bg-orange-600 ${disabled ? 'opacity-50' : ''}`}>
    </div>
    <span className={`ml-3 text-sm font-medium ${disabled ? 'text-gray-500' : 'text-gray-300'}`}>
        {label}
    </span>
  </label>
);

export const ContentFilter: React.FC<ContentFilterProps> = ({ activeFilters, onFilterChange, disabled }) => {

  const handleToggle = (filterId: string, isChecked: boolean) => {
    onFilterChange(
      isChecked
        ? [...activeFilters, filterId]
        : activeFilters.filter(id => id !== filterId)
    );
  };

  return (
    <div>
      <label className="block mb-3 text-sm font-medium text-gray-300">Content Filters</label>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {filters.map(({ id, label }) => (
          <ToggleSwitch
            key={id}
            label={label}
            checked={activeFilters.includes(id)}
            onChange={(isChecked) => handleToggle(id, isChecked)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};