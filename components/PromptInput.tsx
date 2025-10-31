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
      placeholder={placeholder}
      rows={4}
      className="w-full p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/80 transition-all duration-300 disabled:bg-gray-800/50 disabled:cursor-not-allowed"
    />
  );
};