import React from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({ value, onChange, disabled, placeholder }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      // Fix: Use the placeholder prop from the parent component.
      placeholder={placeholder}
      rows={4}
      className="w-full p-4 bg-gray-950 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300 disabled:bg-gray-800 disabled:cursor-not-allowed"
    />
  );
};